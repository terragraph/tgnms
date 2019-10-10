/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <ifaddrs.h>
#include <netinet/in.h>
#include <sys/types.h>

#include <chrono>
#include <memory>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

#include <curl/curl.h>
#include <folly/IPAddress.h>
#include <folly/Synchronized.h>
#include <folly/init/Init.h>
#include <gflags/gflags.h>
#include <glog/logging.h>
#include <proxygen/httpserver/HTTPServer.h>
#include <proxygen/httpserver/RequestHandlerFactory.h>

#include "../query_service/src/ApiServiceClient.h"
#include "../query_service/src/MySqlClient.h"
#include "../query_service/src/PrometheusUtils.h"
#include "../query_service/src/StatsUtils.h"
#include "../query_service/src/consts/PrometheusConsts.h"
#include "../query_service/src/handlers/NotFoundHandler.h"
#include "../query_service/src/handlers/PrometheusMetricsHandler.h"
#include "UdpPinger.h"
#include "if/gen-cpp2/Controller_types.h"
#include "if/gen-cpp2/Topology_types.h"
#include "if/gen-cpp2/beringei_query_types.h"

using namespace facebook::gorilla;
using facebook::terragraph::thrift::StatusDump;

DEFINE_int32(topology_refresh_interval_s, 60, "Topology refresh interval");
DEFINE_int32(ping_interval_s, 10, "Interval at which ping sweeps are started");
DEFINE_int32(num_packets, 10, "Number of packets to send to each host per ping sweep");
DEFINE_int32(num_sender_threads, 1, "Number of sender threads");
DEFINE_int32(num_receiver_threads, 1, "Number of receiver threads");
DEFINE_int32(target_port, 31338, "Target port");
DEFINE_int32(cooldown_time_s, 1, "Cooldown time");
DEFINE_int32(port_count, 64, "Number of ports to ping from");
DEFINE_int32(base_port, 25000, "The starting UDP port to bind to");
DEFINE_int32(pinger_rate_pps, 5, "Rate at which hosts are probed in pings per second");
DEFINE_int32(socket_buffer_size, 425984, "Socket buffer size to send/recv");
DEFINE_string(src_ip, "", "The IP source address to use in probe");
DEFINE_string(src_if, "eth0", "The interface to use if src_ip is not defined");
DEFINE_string(http_ip, "::", "IP/Hostname to bind HTTP server to");
DEFINE_int32(http_port, 3047, "Port to listen on with HTTP protocol");
DEFINE_int32(num_http_threads, 1, "Number of HTTP server threads to listen on");

class RequestHandlerFactory : public proxygen::RequestHandlerFactory {
 public:
  RequestHandlerFactory() {}

  void onServerStart(folly::EventBase* evb) noexcept {}

  void onServerStop() noexcept {}

  proxygen::RequestHandler* onRequest(
      proxygen::RequestHandler* /* unused */,
      proxygen::HTTPMessage* httpMessage) noexcept {
    auto path = httpMessage->getPath();
    LOG(INFO) << "Received a request for " << path;

    if (path == "/metrics/30s") {
      return new PrometheusMetricsHandler(30);
    } else if (path == "/metrics/1s") {
      return new PrometheusMetricsHandler(1);
    } else {
      return new NotFoundHandler();
    }
  }
};

struct AggrUdpPingStat {
  thrift::Target target;
  int count{0};
  int noFullLossCount{0};
  double rttAvgSum{0};
  double rttP75Sum{0};
  double rttP90Sum{0};
  double rttCurrMax{0};
  double lossRatioSum{0};
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

std::vector<UdpTestPlan> getTestPlans() {
  std::vector<UdpTestPlan> testPlans;

  auto mySqlClient = MySqlClient::getInstance();
  if (!mySqlClient) {
    return testPlans;
  }

  mySqlClient->refreshTopologies();

  for (const auto& topologyConfig : mySqlClient->getTopologyConfigs()) {
    auto statusDump = ApiServiceClient::fetchApiService<StatusDump>(
        topologyConfig.second->primary_controller.ip,
        topologyConfig.second->primary_controller.api_port,
        "api/getCtrlStatusDump",
        "{}");

    if (!statusDump) {
      VLOG(2) << "Failed to fetch status dump for "
              << topologyConfig.second->name;
      continue;
    }

    auto topology = ApiServiceClient::fetchApiService<query::Topology>(
        topologyConfig.second->primary_controller.ip,
        topologyConfig.second->primary_controller.api_port,
        "api/getTopology",
        "{}");

    if (!topology) {
      VLOG(2) << "Failed to fetch topology for " << topologyConfig.second->name;
      continue;
    }

    for (const auto& node : topology->nodes) {
      auto statusReportIt = statusDump->statusReports.find(node.mac_addr);
      if (statusReportIt != statusDump->statusReports.end()) {
        std::string ipStr = statusReportIt->second.ipv6Address;
        try {
          auto ipAddr = folly::IPAddress(ipStr);

          if (ipAddr.isV6()) {
            UdpTestPlan testPlan;
            testPlan.target.ip = ipStr;
            testPlan.target.mac = node.mac_addr;
            testPlan.target.name = node.name;
            testPlan.target.site = node.site_name;
            testPlan.target.network = topology->name;
            testPlan.target.is_cn = node.node_type == query::NodeType::CN;
            testPlan.target.is_pop = node.pop_node;
            testPlan.numPackets = FLAGS_num_packets;
            testPlans.push_back(std::move(testPlan));
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

  return testPlans;
}

std::vector<std::string> getMetricLabels(
    const thrift::Target& target,
    int dataInterval) {
  std::vector<std::string> labels = {
      PrometheusUtils::formatNetworkLabel(target.network),
      folly::sformat(
          "{}=\"{}\"", PrometheusConsts::LABEL_DATA_INTERVAL, dataInterval)};

  if (!target.name.empty()) {
    labels.insert(
        labels.end(),
        {folly::sformat(
             "{}=\"{}\"", PrometheusConsts::LABEL_NODE_MAC, target.mac),
         folly::sformat(
             "{}=\"{}\"",
             PrometheusConsts::LABEL_NODE_NAME,
             PrometheusUtils::formatPrometheusKeyName(target.name)),
         folly::sformat(
             "{}=\"{}\"",
             PrometheusConsts::LABEL_NODE_IS_POP,
             target.is_pop ? "true" : "false"),
         folly::sformat(
             "{}=\"{}\"",
             PrometheusConsts::LABEL_NODE_IS_CN,
             target.is_cn ? "true" : "false"),
         folly::sformat(
             "{}=\"{}\"",
             PrometheusConsts::LABEL_SITE_NAME,
             PrometheusUtils::formatPrometheusKeyName(target.site))});
  }

  return labels;
}

UdpTestResults ping(
    const std::vector<UdpTestPlan>& testPlans,
    const UdpPinger& pinger) {
  UdpTestResults results;
  if (!testPlans.empty()) {
    LOG(INFO) << "Pinging " << testPlans.size() << " targets";
    results = pinger.run(testPlans, 0);

    LOG(INFO) << "Finished with " << results.hostResults.size()
              << " host results and " << results.networkResults.size()
              << " network results";
  }

  return results;
}

void writeResults(const UdpTestResults& results) {
  auto now = StatsUtils::getTimeInMs();

  std::vector<Metric> metrics;
  for (const auto& result : results.hostResults) {
    std::vector<std::string> labels = getMetricLabels(result->metadata.dst, 1);

    metrics.emplace_back(
        Metric("pinger_lossRatio", now, labels, result->metrics.loss_ratio));

    if (result->metrics.num_recv > 0) {
      metrics.insert(
          metrics.end(),
          {Metric("pinger_rtt_avg", now, labels, result->metrics.rtt_avg),
           Metric("pinger_rtt_p90", now, labels, result->metrics.rtt_p90),
           Metric("pinger_rtt_p75", now, labels, result->metrics.rtt_p75),
           Metric("pinger_rtt_max", now, labels, result->metrics.rtt_max)});
    }
  }

  for (const auto& result : results.networkResults) {
    std::vector<std::string> labels = getMetricLabels(result->metadata.dst, 1);

    metrics.emplace_back(
        Metric("pinger_lossRatio", now, labels, result->metrics.loss_ratio));

    if (result->metrics.num_recv > 0) {
      metrics.insert(
          metrics.end(),
          {Metric("pinger_rtt_avg", now, labels, result->metrics.rtt_avg),
           Metric("pinger_rtt_p90", now, labels, result->metrics.rtt_p90),
           Metric("pinger_rtt_p75", now, labels, result->metrics.rtt_p75),
           Metric("pinger_rtt_max", now, labels, result->metrics.rtt_max)});
    }
  }

  auto prometheusInstance = PrometheusUtils::getInstance();
  const int reportIntervalSec = 1;
  // ensure metric queue isn't full before writing to it
  if (prometheusInstance->isQueueFull(reportIntervalSec)) {
    LOG(ERROR) << "Prometheus queue full, dropping metrics.";
    return;
  }
  PrometheusUtils::getInstance()->enqueueMetrics(
      30 /* interval in s */, metrics);
}

void writeAggrResults(const std::vector<UdpTestResults>& aggrResults) {
  auto now = StatsUtils::getTimeInMs();
  const int dataInterval = 30;

  std::unordered_map<std::string /* host or network name */, AggrUdpPingStat>
      aggrUdpPingStatMap;

  for (const auto& result : aggrResults) {
    for (const auto& hostResult : result.hostResults) {
      auto& aggrUdpPingStat = aggrUdpPingStatMap[hostResult->metadata.dst.name];
      aggrUdpPingStat.target = hostResult->metadata.dst;
      aggrUdpPingStat.count++;
      aggrUdpPingStat.lossRatioSum += hostResult->metrics.loss_ratio;

      if (hostResult->metrics.num_recv > 0) {
        aggrUdpPingStat.noFullLossCount++;
        aggrUdpPingStat.rttAvgSum += hostResult->metrics.rtt_avg;
        aggrUdpPingStat.rttP90Sum += hostResult->metrics.rtt_p90;
        aggrUdpPingStat.rttP75Sum += hostResult->metrics.rtt_p75;

        if (hostResult->metrics.rtt_max > aggrUdpPingStat.rttCurrMax) {
          aggrUdpPingStat.rttCurrMax = hostResult->metrics.rtt_max;
        }
      }
    }

    for (const auto& networkResult : result.networkResults) {
      auto& aggrUdpPingStat =
          aggrUdpPingStatMap[networkResult->metadata.dst.network];
      aggrUdpPingStat.target = networkResult->metadata.dst;
      aggrUdpPingStat.count++;
      aggrUdpPingStat.lossRatioSum += networkResult->metrics.loss_ratio;

      if (networkResult->metrics.num_recv > 0) {
        aggrUdpPingStat.noFullLossCount++;
        aggrUdpPingStat.rttAvgSum += networkResult->metrics.rtt_avg;
        aggrUdpPingStat.rttP90Sum += networkResult->metrics.rtt_p90;
        aggrUdpPingStat.rttP75Sum += networkResult->metrics.rtt_p75;

        if (networkResult->metrics.rtt_max > aggrUdpPingStat.rttCurrMax) {
          aggrUdpPingStat.rttCurrMax = networkResult->metrics.rtt_max;
        }
      }
    }
  }

  std::vector<Metric> metrics;
  for (const auto& aggrUdpPingStatIt : aggrUdpPingStatMap) {
    const auto& aggrUdpPingStat = aggrUdpPingStatIt.second;
    std::vector<std::string> labels =
        getMetricLabels(aggrUdpPingStat.target, dataInterval);

    metrics.emplace_back(Metric(
        "pinger_lossRatio",
        now,
        labels,
        aggrUdpPingStat.lossRatioSum / aggrUdpPingStat.count));

    if (aggrUdpPingStat.noFullLossCount > 0) {
      metrics.insert(
          metrics.end(),
          {Metric(
               "pinger_rtt_avg",
               now,
               labels,
               aggrUdpPingStat.rttAvgSum / aggrUdpPingStat.noFullLossCount),
           Metric(
               "pinger_rtt_p90",
               now,
               labels,
               aggrUdpPingStat.rttP90Sum / aggrUdpPingStat.noFullLossCount),
           Metric(
               "pinger_rtt_p75",
               now,
               labels,
               aggrUdpPingStat.rttP75Sum / aggrUdpPingStat.noFullLossCount),
           Metric("pinger_rtt_max", now, labels, aggrUdpPingStat.rttCurrMax)});
    }
  }
  auto prometheusInstance = PrometheusUtils::getInstance();
  if (prometheusInstance->isQueueFull(dataInterval)) {
    LOG(ERROR) << "Prometheus queue full, dropping metrics.";
    return;
  }
  prometheusInstance->enqueueMetrics(dataInterval, metrics);
}

int main(int argc, char* argv[]) {
  folly::init(&argc, &argv, true);

  LOG(INFO) << "Attemping to bind HTTP server to port " << FLAGS_http_port;

  std::vector<proxygen::HTTPServer::IPConfig> httpIps = {
      {folly::SocketAddress(FLAGS_http_ip, FLAGS_http_port, true),
       proxygen::HTTPServer::Protocol::HTTP},
  };

  // Initialize curl thread un-safe operations
  curl_global_init(CURL_GLOBAL_ALL);

  proxygen::HTTPServerOptions options;
  options.threads = static_cast<size_t>(FLAGS_num_http_threads);
  options.idleTimeout = std::chrono::milliseconds(60000);
  options.shutdownOn = {SIGINT, SIGTERM};
  options.enableContentCompression = false;
  options.handlerFactories = proxygen::RequestHandlerChain()
                                 .addThen<RequestHandlerFactory>()
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
  config.pinger_cooldown_time = FLAGS_cooldown_time_s;
  config.pinger_rate = FLAGS_pinger_rate_pps;
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
  folly::Synchronized<std::vector<UdpTestResults>> aggrResults;

  auto topologyRefreshTimer = std::thread([&]() noexcept {
    while (true) {
      std::vector<UdpTestPlan> newTestPlans = getTestPlans();
      if (newTestPlans.empty()) {
        LOG(INFO) << "Working with a stale copy of test plans";
      } else {
        testPlans.swap(newTestPlans);
      }

      auto now = StatsUtils::getTimeInMs();

      auto nextRunTime =
          (long(now / (FLAGS_topology_refresh_interval_s * 1000)) *
           FLAGS_topology_refresh_interval_s * 1000) +
          FLAGS_topology_refresh_interval_s * 1000;

      std::this_thread::sleep_for(std::chrono::milliseconds(nextRunTime - now));
    }
  });

  auto udpPingTimer = std::thread([&]() noexcept {
    while (true) {
      UdpTestResults results = ping(testPlans.copy(), pinger);
      aggrResults.wlock()->push_back(results);
      writeResults(results);

      auto now = StatsUtils::getTimeInMs();

      auto nextRunTime = (long(now / (FLAGS_ping_interval_s * 1000)) *
                          FLAGS_ping_interval_s * 1000) +
          FLAGS_ping_interval_s * 1000;

      std::this_thread::sleep_for(std::chrono::milliseconds(nextRunTime - now));
    }
  });

  auto aggrResultsTimer = std::thread([&]() noexcept {
    std::this_thread::sleep_for(std::chrono::seconds(30));
    while (true) {
      std::vector<UdpTestResults> aggrResultsCopy;
      aggrResults.swap(aggrResultsCopy);
      writeAggrResults(aggrResultsCopy);

      auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                     std::chrono::system_clock::now().time_since_epoch())
                     .count();

      auto nextRunTime = (long(now / 30000) * 30000) + 30000;

      std::this_thread::sleep_for(std::chrono::milliseconds(nextRunTime - now));
    }
  });

  topologyRefreshTimer.join();
  udpPingTimer.join();
  aggrResultsTimer.join();

  return 0;
}
