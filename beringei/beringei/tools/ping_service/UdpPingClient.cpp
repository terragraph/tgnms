/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <arpa/inet.h>
#include <ifaddrs.h>
#include <netinet/in.h>
#include <sys/types.h>

#include <chrono>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include <curl/curl.h>
#include <folly/IPAddress.h>
#include <folly/Synchronized.h>
#include <folly/init/Init.h>
#include <folly/io/async/AsyncTimeout.h>
#include <gflags/gflags.h>
#include <glog/logging.h>
#include <proxygen/httpserver/HTTPServer.h>
#include <proxygen/httpserver/RequestHandlerFactory.h>

#include "../query_service/ApiServiceClient.h"
#include "../query_service/MySqlClient.h"
#include "../query_service/PrometheusUtils.h"
#include "../query_service/consts/PrometheusConsts.h"
#include "../query_service/handlers/NotFoundHandler.h"
#include "../query_service/handlers/PrometheusMetricsHandler.h"
#include "UdpPinger.h"
#include "beringei/if/gen-cpp2/Controller_types.h"
#include "beringei/if/gen-cpp2/Topology_types.h"
#include "beringei/if/gen-cpp2/beringei_query_types.h"

using namespace facebook::gorilla;
using facebook::terragraph::thrift::StatusDump;

DEFINE_int32(topology_refresh_interval_s, 30, "Topology refresh interval");
DEFINE_int32(ping_interval_s, 3, "Interval at which pings are sent");
DEFINE_int32(num_packets, 20, "Number of packets to send per ping interval");
DEFINE_int32(num_sender_threads, 2, "Number of sender threads");
DEFINE_int32(num_receiver_threads, 8, "Number of receiver threads");
DEFINE_int32(target_port, 31338, "Target port");
DEFINE_int32(cooldown_time, 1, "Cooldown time");
DEFINE_int32(port_count, 64, "Number of ports to ping from");
DEFINE_int32(base_port, 25000, "The starting UDP port to bind to");
DEFINE_int32(pinger_rate, 5000, "The rate we ping with");
DEFINE_int32(socket_buffer_size, 425984, "Socket buffer size to send/recv");
DEFINE_string(src_ip, "", "The IP source address to use in probe");
DEFINE_string(src_if, "eth0", "The interface to use if src_ip is not defined");
DEFINE_string(http_ip, "::", "IP/Hostname to bind HTTP server to");
DEFINE_int32(http_port, 3047, "Port to listen on with HTTP protocol");
DEFINE_int32(num_http_threads, 2, "Number of threads to listen on");

class RequestHandlerFactory : public proxygen::RequestHandlerFactory {
 public:
  RequestHandlerFactory(TACacheMap& typeaheadCache)
      : typeaheadCache_(typeaheadCache) {}

  void onServerStart(folly::EventBase* evb) noexcept {}

  void onServerStop() noexcept {}

  proxygen::RequestHandler* onRequest(
      proxygen::RequestHandler* /* unused */,
      proxygen::HTTPMessage* httpMessage) noexcept {
    auto path = httpMessage->getPath();
    LOG(INFO) << "Received a request for path: " << path;

    if (path == "/metrics/30s") {
      return new PrometheusMetricsHandler(typeaheadCache_, 30);
    } else if (path == "/metrics/1s") {
      return new PrometheusMetricsHandler(typeaheadCache_, 1);
    } else {
      return new NotFoundHandler();
    }
  }

 private:
  TACacheMap& typeaheadCache_;
};

std::string getAddressFromInterface() {
  struct ifaddrs *ifaddr, *ifa;
  if (getifaddrs(&ifaddr) == -1) {
    LOG(FATAL) << "getifaddrs() failed";
  }

  for (ifa = ifaddr; ifa != nullptr; ifa = ifa->ifa_next) {
    if (ifa->ifa_addr == nullptr) {
      continue;
    }

    if (ifa->ifa_addr->sa_family == AF_INET6 &&
        FLAGS_src_if.compare(ifa->ifa_name) == 0) {
      char str[INET6_ADDRSTRLEN];
      if (inet_ntop(
              AF_INET6,
              &((struct sockaddr_in6*)ifa->ifa_addr)->sin6_addr,
              str,
              INET6_ADDRSTRLEN)) {
        return str;
      }
    }
  }

  freeifaddrs(ifaddr);

  // Return something that will throw an error, if we get here we've failed
  return "";
}

void getTestPlans(
    const std::shared_ptr<folly::AsyncTimeout>& timer,
    folly::Synchronized<std::vector<UdpTestPlan>>& testPlans) {
  timer->scheduleTimeout(FLAGS_topology_refresh_interval_s * 1000);

  auto mySqlClient = MySqlClient::getInstance();
  mySqlClient->refreshTopologies();
  mySqlClient->refreshAll();

  std::vector<UdpTestPlan> newTestPlans;
  auto apiServiceClient = std::make_unique<ApiServiceClient>();

  for (const auto& topologyConfig : mySqlClient->getTopologyConfigs()) {
    auto statusReports =
        apiServiceClient
            ->fetchApiService<StatusDump>(
                topologyConfig.second->primary_controller.ip,
                topologyConfig.second->primary_controller.api_port,
                "api/getCtrlStatusDump",
                "{}")
            .statusReports;

    auto topology = apiServiceClient->fetchApiService<query::Topology>(
        topologyConfig.second->primary_controller.ip,
        topologyConfig.second->primary_controller.api_port,
        "api/getTopology",
        "{}");

    for (const auto& node : topology.nodes) {
      auto statusReportIt = statusReports.find(node.mac_addr);
      if (statusReportIt != statusReports.end()) {
        std::string ipStr = statusReportIt->second.ipv6Address;
        try {
          auto ipAddr = folly::IPAddress(ipStr);

          if (ipAddr.isV6()) {
            UdpTestPlan testPlan;
            testPlan.target.ip = ipStr;
            testPlan.target.mac = node.mac_addr;
            testPlan.target.name = node.name;
            testPlan.target.site = node.site_name;
            testPlan.target.network = topology.name;
            testPlan.target.is_cn = node.node_type == query::NodeType::CN;
            testPlan.target.is_pop = node.pop_node;
            testPlan.numPackets = FLAGS_num_packets;
            newTestPlans.push_back(std::move(testPlan));
          } else {
            VLOG(5) << "Skipping IPv4 address " << ipStr;
          }
        } catch (const folly::IPAddressFormatException& e) {
          if (!ipStr.empty()) {
            LOG(WARNING) << ipStr << " isn't an IP address";
          }
        }
      }
    }
  }

  testPlans.wlock()->swap(newTestPlans);
}

UdpTestResults ping(
    const std::shared_ptr<folly::AsyncTimeout>& timer,
    folly::Synchronized<std::vector<UdpTestPlan>>& testPlans,
    const UdpPinger& pinger) {
  timer->scheduleTimeout(FLAGS_ping_interval_s * 1000);

  UdpTestResults results;
  auto lockedTestPlans = testPlans.rlock();
  if (!lockedTestPlans->empty()) {
    // Start the pinger
    LOG(INFO) << "Pinging " << lockedTestPlans->size() << " targets";
    results = pinger.run(*lockedTestPlans, 0);
    lockedTestPlans.unlock();  // lockedTestPlans -> NULL

    LOG(INFO) << "Finished with " << results.hostResults.size()
              << " host results and " << results.networkResults.size()
              << " network results";
  }

  return results;
}

void writeResults(const UdpTestResults& results) {
  auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                 std::chrono::system_clock::now().time_since_epoch())
                 .count();

  std::unordered_map<
      std::string /* network name */,
      std::vector<Metric> /* metrics list */>
      metricsMap;

  for (const auto& result : results.hostResults) {
    auto networkName = result->metadata.dst.network;

    std::vector<std::string> labels;
    labels.emplace_back(PrometheusUtils::formatNetworkLabel(networkName));
    labels.emplace_back(
        folly::sformat("{}=\"{}\"", PrometheusConsts::LABEL_DATA_INTERVAL, 1));
    labels.emplace_back(folly::sformat(
        "{}=\"{}\"",
        PrometheusConsts::LABEL_NODE_MAC,
        result->metadata.dst.mac));
    labels.emplace_back(folly::sformat(
        "{}=\"{}\"",
        PrometheusConsts::LABEL_NODE_NAME,
        PrometheusUtils::formatPrometheusKeyName(result->metadata.dst.name)));
    labels.emplace_back(folly::sformat(
        "{}=\"{}\"",
        PrometheusConsts::LABEL_NODE_IS_POP,
        result->metadata.dst.is_pop ? "true" : "false"));
    labels.emplace_back(folly::sformat(
        "{}=\"{}\"",
        PrometheusConsts::LABEL_NODE_IS_CN,
        result->metadata.dst.is_cn ? "true" : "false"));
    labels.emplace_back(folly::sformat(
        "{}=\"{}\"",
        PrometheusConsts::LABEL_SITE_NAME,
        PrometheusUtils::formatPrometheusKeyName(result->metadata.dst.site)));

    auto& currMetrics = metricsMap[networkName];
    currMetrics.emplace_back(
        Metric("pinger_lossRatio", now, labels, result->metrics.loss_ratio));

    if (result->metrics.num_recv > 0) {
      currMetrics.insert(
          currMetrics.end(),
          {Metric("pinger_rtt_avg", now, labels, result->metrics.rtt_avg),
           Metric("pinger_rtt_p90", now, labels, result->metrics.rtt_p90),
           Metric("pinger_rtt_p75", now, labels, result->metrics.rtt_p75)});
    }
  }

  for (const auto& result : results.networkResults) {
    auto networkName = result->metadata.dst.network;

    std::vector<std::string> labels;
    labels.emplace_back(PrometheusUtils::formatNetworkLabel(networkName));
    labels.emplace_back(
        folly::sformat("{}=\"{}\"", PrometheusConsts::LABEL_DATA_INTERVAL, 1));

    auto& currMetrics = metricsMap[networkName];
    currMetrics.emplace_back(
        Metric("pinger_lossRatio", now, labels, result->metrics.loss_ratio));

    if (result->metrics.num_recv > 0) {
      currMetrics.insert(
          currMetrics.end(),
          {Metric("pinger_rtt_avg", now, labels, result->metrics.rtt_avg),
           Metric("pinger_rtt_p90", now, labels, result->metrics.rtt_p90),
           Metric("pinger_rtt_p75", now, labels, result->metrics.rtt_p75)});
    }
  }

  auto prometheusInstance = PrometheusUtils::getInstance();
  for (const auto& metricsMapIt : metricsMap) {
    prometheusInstance->writeMetrics(
        metricsMapIt.first, "udp_ping_client", 1, metricsMapIt.second);
  }
}

int main(int argc, char* argv[]) {
  folly::init(&argc, &argv, true);
  folly::EventBase eb;

  LOG(INFO) << "Attemping to bind to port " << FLAGS_http_port;

  std::vector<proxygen::HTTPServer::IPConfig> httpIps = {
      {folly::SocketAddress(FLAGS_http_ip, FLAGS_http_port, true),
       proxygen::HTTPServer::Protocol::HTTP},
  };

  // Initialize curl thread un-safe operations
  curl_global_init(CURL_GLOBAL_ALL);

  // Initialize type-ahead
  TACacheMap typeaheadCache;

  proxygen::HTTPServerOptions options;
  options.threads = static_cast<size_t>(FLAGS_num_http_threads);
  options.idleTimeout = std::chrono::milliseconds(60000);
  options.shutdownOn = {SIGINT, SIGTERM};
  options.enableContentCompression = false;
  options.handlerFactories = proxygen::RequestHandlerChain()
                                 .addThen<RequestHandlerFactory>(typeaheadCache)
                                 .build();

  LOG(INFO) << "Starting UDP ping client HTTP server on port "
            << FLAGS_http_port;

  auto server = std::make_shared<proxygen::HTTPServer>(std::move(options));
  server->bind(httpIps);
  std::thread httpThread([server]() { server->start(); });

  // Build a config object for the UdpPinger
  thrift::Config config;
  config.target_port = FLAGS_target_port;
  config.num_sender_threads = FLAGS_num_sender_threads;
  config.num_receiver_threads = FLAGS_num_receiver_threads;
  config.pinger_cooldown_time = FLAGS_cooldown_time;
  config.pinger_rate = FLAGS_pinger_rate;
  config.socket_buffer_size = FLAGS_socket_buffer_size;
  config.src_port_count = FLAGS_port_count;
  config.base_src_port = FLAGS_base_port;

  // If not provided, find the source address from an interface
  folly::IPAddress srcIp;
  try {
    if (!FLAGS_src_ip.empty()) {
      srcIp = folly::IPAddress(FLAGS_src_ip);
    } else {
      srcIp = folly::IPAddress(getAddressFromInterface());
    }
  } catch (const folly::IPAddressFormatException& e) {
    srcIp = folly::IPAddress("::1");
    LOG(WARNING) << "We are using the IPv6 loopback address";
  }

  UdpPinger pinger(config, srcIp);
  folly::Synchronized<std::vector<UdpTestPlan>> testPlans;

  // Start the topology refresh timer
  std::shared_ptr<folly::AsyncTimeout> topologyRefreshTimer =
      folly::AsyncTimeout::make(eb, [&]() noexcept {
        getTestPlans(topologyRefreshTimer, testPlans);
      });
  topologyRefreshTimer->scheduleTimeout(0);

  // Start the pinger timer
  std::shared_ptr<folly::AsyncTimeout> udpPingTimer =
      folly::AsyncTimeout::make(eb, [&]() noexcept {
        auto results = ping(udpPingTimer, testPlans, pinger);
        writeResults(results);
      });
  udpPingTimer->scheduleTimeout(1000);

  eb.loopForever();
  return 0;
}
