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

#include <folly/Format.h>
#include <folly/IPAddress.h>
#include <folly/Synchronized.h>
#include <folly/init/Init.h>
#include <gflags/gflags.h>
#include <glog/logging.h>

#include "../query_service/src/ApiServiceClient.h"
#include "../query_service/src/MySqlClient.h"
#include "../query_service/src/PrometheusUtils.h"
#include "../query_service/src/StatsUtils.h"
#include "../query_service/src/consts/PrometheusConsts.h"
#include "UdpPinger.h"
#include "if/gen-cpp2/Controller_types.h"
#include "if/gen-cpp2/QueryService_types.h"
#include "if/gen-cpp2/Topology_types.h"

using namespace facebook::terragraph::stats;
using facebook::terragraph::thrift::NodeType;
using facebook::terragraph::thrift::StatusDump;
using facebook::terragraph::thrift::Target;
using facebook::terragraph::thrift::Topology;

DEFINE_int32(topology_refresh_interval_s, 60, "Topology refresh interval");
DEFINE_int32(ping_interval_s, 10, "Interval at which ping sweeps are started");
DEFINE_int32(
    num_packets,
    10,
    "Number of packets to send to each host per ping sweep");
DEFINE_int32(num_sender_threads, 1, "Number of sender threads");
DEFINE_int32(num_receiver_threads, 1, "Number of receiver threads");
DEFINE_int32(target_port, 31338, "Target port");
DEFINE_int32(cooldown_time_s, 1, "Cooldown time");
DEFINE_int32(port_count, 64, "Number of ports to ping from");
DEFINE_int32(base_port, 25000, "The starting UDP port to bind to");
DEFINE_int32(
    pinger_rate_pps,
    5,
    "Rate at which hosts are probed in pings per second");
DEFINE_int32(socket_buffer_size, 425984, "Socket buffer size to send/recv");
DEFINE_string(src_ip, "", "The IP source address to use in probe");
DEFINE_string(src_if, "", "The interface to use if src_ip is not defined");
DEFINE_string(
    prometheus_job_name,
    "udp_pinger",
    "Prometheus job name for submitting metrics");

struct AggrUdpPingStat {
  Target target;
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
    // Skip v4 addresses
    if (ifa->ifa_addr == nullptr || ifa->ifa_addr->sa_family != AF_INET6) {
      continue;
    }

    if (!FLAGS_src_if.empty() && FLAGS_src_if.compare(ifa->ifa_name) != 0) {
      continue;
    }

    char str[INET6_ADDRSTRLEN];
    auto s6 = (struct sockaddr_in6*)ifa->ifa_addr;

    // Find the global scope address
    if (!IN6_IS_ADDR_LINKLOCAL(&s6->sin6_addr) &&
        !IN6_IS_ADDR_LOOPBACK(&s6->sin6_addr) &&
        inet_ntop(AF_INET6, &s6->sin6_addr, str, INET6_ADDRSTRLEN)) {
      return str;
    }
  }

  freeifaddrs(ifaddr);

  // Return something that will throw an error
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
    auto statusDump = ApiServiceClient::makeRequest<StatusDump>(
        topologyConfig.second->primary_controller.ip,
        topologyConfig.second->primary_controller.api_port,
        "api/getCtrlStatusDump");

    if (!statusDump) {
      VLOG(2) << "Failed to fetch status dump for "
              << topologyConfig.second->name;
      continue;
    }

    auto topology = ApiServiceClient::makeRequest<Topology>(
        topologyConfig.second->primary_controller.ip,
        topologyConfig.second->primary_controller.api_port,
        "api/getTopology");

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
            testPlan.target.is_cn = node.node_type == NodeType::CN;
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
    const Target& target,
    int dataInterval) {
  std::vector<std::string> labels = {folly::sformat(
                                         PrometheusConsts::METRIC_FORMAT,
                                         PrometheusConsts::LABEL_NETWORK,
                                         target.network),
                                     folly::sformat(
                                         PrometheusConsts::METRIC_FORMAT,
                                         PrometheusConsts::LABEL_DATA_INTERVAL,
                                         dataInterval)};

  if (!target.name.empty()) {
    labels.insert(
        labels.end(),
        {folly::sformat(
             PrometheusConsts::METRIC_FORMAT,
             PrometheusConsts::LABEL_NODE_MAC,
             target.mac),
         folly::sformat(
             PrometheusConsts::METRIC_FORMAT,
             PrometheusConsts::LABEL_NODE_NAME,
             PrometheusUtils::formatPrometheusKeyName(target.name)),
         folly::sformat(
             PrometheusConsts::METRIC_FORMAT,
             PrometheusConsts::LABEL_NODE_IS_POP,
             target.is_pop),
         folly::sformat(
             PrometheusConsts::METRIC_FORMAT,
             PrometheusConsts::LABEL_NODE_IS_CN,
             target.is_cn),
         folly::sformat(
             PrometheusConsts::METRIC_FORMAT,
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

    metrics.emplace_back(Metric(
        "udp_pinger_loss_ratio", now, labels, result->metrics.loss_ratio));

    if (result->metrics.num_recv > 0) {
      metrics.insert(
          metrics.end(),
          {Metric("udp_pinger_rtt_avg", now, labels, result->metrics.rtt_avg),
           Metric("udp_pinger_rtt_p90", now, labels, result->metrics.rtt_p90),
           Metric("udp_pinger_rtt_p75", now, labels, result->metrics.rtt_p75),
           Metric("udp_pinger_rtt_max", now, labels, result->metrics.rtt_max)});
    }
  }

  for (const auto& result : results.networkResults) {
    std::vector<std::string> labels = getMetricLabels(result->metadata.dst, 1);

    metrics.emplace_back(Metric(
        "udp_pinger_loss_ratio", now, labels, result->metrics.loss_ratio));

    if (result->metrics.num_recv > 0) {
      metrics.insert(
          metrics.end(),
          {Metric("udp_pinger_rtt_avg", now, labels, result->metrics.rtt_avg),
           Metric("udp_pinger_rtt_p90", now, labels, result->metrics.rtt_p90),
           Metric("udp_pinger_rtt_p75", now, labels, result->metrics.rtt_p75),
           Metric("udp_pinger_rtt_max", now, labels, result->metrics.rtt_max)});
    }
  }

  if (!PrometheusUtils::enqueueMetrics(FLAGS_prometheus_job_name, metrics)) {
    LOG(ERROR) << "Unable to write metrics to Prometheus queue.";
  }
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
        "udp_pinger_loss_ratio",
        now,
        labels,
        aggrUdpPingStat.lossRatioSum / aggrUdpPingStat.count));

    if (aggrUdpPingStat.noFullLossCount > 0) {
      metrics.insert(
          metrics.end(),
          {Metric(
               "udp_pinger_rtt_avg",
               now,
               labels,
               aggrUdpPingStat.rttAvgSum / aggrUdpPingStat.noFullLossCount),
           Metric(
               "udp_pinger_rtt_p90",
               now,
               labels,
               aggrUdpPingStat.rttP90Sum / aggrUdpPingStat.noFullLossCount),
           Metric(
               "udp_pinger_rtt_p75",
               now,
               labels,
               aggrUdpPingStat.rttP75Sum / aggrUdpPingStat.noFullLossCount),
           Metric(
               "udp_pinger_rtt_max", now, labels, aggrUdpPingStat.rttCurrMax)});
    }
  }

  if (!PrometheusUtils::enqueueMetrics(FLAGS_prometheus_job_name, metrics)) {
    LOG(ERROR) << "Unable to write metrics to Prometheus queue.";
  }
}

int main(int argc, char* argv[]) {
  folly::init(&argc, &argv, true);

  // If not provided, find the source address from an interface
  folly::IPAddress srcIp;
  try {
    if (FLAGS_src_ip.empty()) {
      srcIp = folly::IPAddress(getAddressFromInterface());
    } else {
      srcIp = folly::IPAddress(FLAGS_src_ip);
    }
  } catch (const folly::IPAddressFormatException& e) {
    srcIp = folly::IPAddress("::1");
    LOG(WARNING) << "We are using the IPv6 loopback address";
  }

  VLOG(2) << "Using source addr: " << srcIp;

  // Build a config object for the UdpPinger
  facebook::terragraph::thrift::PingerConfig config;
  config.target_port = FLAGS_target_port;
  config.num_sender_threads = FLAGS_num_sender_threads;
  config.num_receiver_threads = FLAGS_num_receiver_threads;
  config.pinger_cooldown_time = FLAGS_cooldown_time_s;
  config.pinger_rate = FLAGS_pinger_rate_pps;
  config.socket_buffer_size = FLAGS_socket_buffer_size;
  config.src_port_count = FLAGS_port_count;
  config.base_src_port = FLAGS_base_port;

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
