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

#include <memory>
#include <string>
#include <unordered_set>
#include <vector>

#include <folly/IPAddress.h>
#include <folly/Synchronized.h>
#include <folly/init/Init.h>
#include <folly/io/async/AsyncTimeout.h>
#include <gflags/gflags.h>
#include <glog/logging.h>

#include "../query_service/ApiServiceClient.h"
#include "../query_service/MySqlClient.h"
#include "UdpPinger.h"
#include "beringei/if/gen-cpp2/Controller_types.h"
#include "beringei/if/gen-cpp2/Topology_types.h"
#include "beringei/if/gen-cpp2/beringei_query_types.h"

using namespace facebook::gorilla;
using apache::thrift::FRAGILE;
using apache::thrift::SimpleJSONSerializer;
using facebook::terragraph::thrift::StatusDump;

DEFINE_int32(topology_refresh_interval_s, 30, "Topology refresh interval");
DEFINE_int32(ping_interval_s, 1, "Interval at which pings are sent");
DEFINE_int32(num_packets, 200, "Number of packets to send per target");
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
DEFINE_string(bqs_ip, "", "The IP address to reach BQS");
DEFINE_int32(bqs_port, 8086, "The port to BQS uses to listen to requests");

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
    folly::Synchronized<std::vector<UdpTestPlan>>& testPlans,
    folly::Synchronized<std::unordered_map<std::string, query::Topology>>&
        topologyMap) {
  timer->scheduleTimeout(FLAGS_topology_refresh_interval_s * 1000);

  auto mySqlClient = MySqlClient::getInstance();
  mySqlClient->refreshTopologies();
  mySqlClient->refreshAll();

  std::vector<UdpTestPlan> newTestPlans;
  std::unordered_map<std::string, query::Topology> newTopologyMap;
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

    newTopologyMap.emplace(topology.name, topology);

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
            testPlan.target.topology = topology.name;
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

  auto ret = folly::acquireLocked(testPlans, topologyMap);
  auto& lockedTestPlans = std::get<0>(ret);
  auto& lockedTopologyMap = std::get<1>(ret);
  lockedTestPlans->swap(newTestPlans);
  lockedTopologyMap->swap(newTopologyMap);
  lockedTestPlans.unlock(); // lockedTestPlans -> NULL
  lockedTopologyMap.unlock(); // lockedTopologyMap -> NULL
}

void ping(
    const std::shared_ptr<folly::AsyncTimeout>& timer,
    folly::Synchronized<std::vector<UdpTestPlan>>& testPlans,
    folly::Synchronized<std::unordered_map<std::string, query::Topology>>&
        topologyMap,
    UdpPinger& pinger) {
  timer->scheduleTimeout(FLAGS_ping_interval_s * 1000);

  auto lockedTestPlans = testPlans.rlock();
  if (lockedTestPlans->empty()) {
    return;
  }

  // Start the pinger
  LOG(INFO) << "Pinging " << lockedTestPlans->size() << " targets";
  auto results = pinger.run(*lockedTestPlans, 0);
  lockedTestPlans.unlock(); // lockedTestPlans -> NULL

  // Save the results
  LOG(INFO) << "Finished with " << results.size() << " host results";

  std::unordered_map<
      std::string /* topology name */,
      std::vector<query::NodeStates>>
      nodeStatesMap;

  for (const auto& result : results) {
    if (result->metrics.numRecv > 0) {
      auto& nodeStates = nodeStatesMap[result->metadata.dst.topology];

      query::NodeStates nodeState;
      nodeState.mac = result->metadata.dst.mac;
      nodeState.name = result->metadata.dst.name;
      nodeState.site = result->metadata.dst.site;
      nodeState.stats.emplace_back(query::Stat(
          FRAGILE, "pinger.rttP90", result->timestamp, result->metrics.rttP90));
      nodeState.stats.emplace_back(query::Stat(
          FRAGILE, "pinger.rttP75", result->timestamp, result->metrics.rttP75));
      nodeState.stats.emplace_back(query::Stat(
          FRAGILE,
          "pinger.nodeAvailability",
          result->timestamp,
          result->metrics.pctBelowMaxRtt));

      nodeStates.push_back(std::move(nodeState));
    }
  }

  auto apiServiceClient = std::make_unique<ApiServiceClient>();
  auto lockedTopologyMap = topologyMap.rlock();
  for (const auto& nodeStatesIt : nodeStatesMap) {
    query::StatsWriteRequest writeReq;
    writeReq.topology = lockedTopologyMap->at(nodeStatesIt.first);
    writeReq.agents = nodeStatesIt.second;
    writeReq.interval = 1;

    apiServiceClient->fetchApiService<query::StatsWriteResponse>(
        FLAGS_bqs_ip,
        FLAGS_bqs_port,
        "stats_writer",
        SimpleJSONSerializer::serialize<std::string>(writeReq));
  }

  lockedTopologyMap.unlock(); // lockedTopologyMap -> NULL
}

int main(int argc, char* argv[]) {
  folly::init(&argc, &argv, true);
  folly::EventBase eb;

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
  folly::IPAddress src_ip;
  try {
    if (!FLAGS_src_ip.empty()) {
      src_ip = folly::IPAddress(FLAGS_src_ip);
    } else {
      src_ip = folly::IPAddress(getAddressFromInterface());
    }
  } catch (const folly::IPAddressFormatException& e) {
    src_ip = folly::IPAddress("::1");
    LOG(WARNING) << "We are using the IPv6 loopback address";
  }

  UdpPinger pinger(config, src_ip);
  folly::Synchronized<std::vector<UdpTestPlan>> testPlans;
  folly::Synchronized<std::unordered_map<std::string, query::Topology>>
      topologyMap;

  std::shared_ptr<folly::AsyncTimeout> topologyRefreshTimer =
      folly::AsyncTimeout::make(eb, [&]() noexcept {
        getTestPlans(topologyRefreshTimer, testPlans, topologyMap);
      });
  topologyRefreshTimer->scheduleTimeout(0);

  std::shared_ptr<folly::AsyncTimeout> udpPingTimer =
      folly::AsyncTimeout::make(eb, [&]() noexcept {
        ping(udpPingTimer, testPlans, topologyMap, pinger);
      });
  udpPingTimer->scheduleTimeout(1000);

  eb.loopForever();

  return 0;
}
