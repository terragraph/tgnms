/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "AggregatorService.h"

#include "CurlUtil.h"
#include "KafkaStatsService.h"
#include "MySqlClient.h"
#include "StatsUtils.h"
#include "TopologyStore.h"
#include "WirelessController.h"
#include "consts/PrometheusConsts.h"

#include "if/gen-cpp2/Stats_types_custom_protocol.h"
#include "if/gen-cpp2/Topology_types_custom_protocol.h"

#include <folly/String.h>
#include <folly/system/ThreadName.h>
#include <folly/io/async/AsyncTimeout.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <cmath>

DEFINE_int32(agg_time_period, 30, "Aggregation time interval (seconds)");
DEFINE_int32(
    ruckus_controller_time_period,
    30,
    "Ruckus controller stats fetch time period");
DEFINE_bool(write_agg_data, true, "Write collected data points");

// skip labels with statistics data when tagging ruckus APs
const std::set<std::string> RUCKUS_SKIP_LABELS = {"approvedTime",
                                                  "clientCount",
                                                  "lastSeenTime",
                                                  "uptime"};
using namespace facebook::terragraph;

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::seconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

AggregatorService::AggregatorService() {
  ebThread_ = std::thread([this]() {
    folly::setThreadName("Aggregator Service");
    this->eb_.loopForever();
  });
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  eb_.runInEventBaseThread(
      [&]() { timer_->scheduleTimeout(FLAGS_agg_time_period * 1000); });
}

AggregatorService::~AggregatorService() {
  ebThread_.join();
}

void AggregatorService::timerCb() {
  LOG(INFO) << "Aggregator running.";
  timer_->scheduleTimeout(FLAGS_agg_time_period * 1000);
  doPeriodicWork();
}

void AggregatorService::doPeriodicWork() {
  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();
  for (const auto& topologyConfig : topologyList) {
    std::vector<Metric> aggValues{};
    auto topology = topologyConfig.second->topology_ref();
    fetchAndLogTopologyMetrics(aggValues, *topology);
    fetchAndLogWirelessControllerMetrics(aggValues, *(topologyConfig.second));
    // write metrics to prometheus (per network)
    if (!PrometheusUtils::enqueueMetrics("aggregator_service", aggValues)) {
      LOG(ERROR) << "Unable to write metrics to Prometheus queue.";
    }
  }
}

void AggregatorService::fetchAndLogTopologyMetrics(
    std::vector<Metric>& aggValues,
    const thrift::Topology& topology) {
  LOG(INFO) << "\tTopology: " << topology.name;
  if (topology.name.empty() || topology.nodes.empty() ||
      topology.links.empty()) {
    LOG(INFO) << "\t\tInvalid topology (name, nodes, or links empty)";
    return;
  }
  // nodes up + down
  int onlineNodes = 0;
  int popNodes = 0;
  // quicker lookups of node metadata
  long ts = StatsUtils::getTimeInMs();
  std::string networkLabel = folly::sformat(
      PrometheusConsts::METRIC_FORMAT,
      PrometheusConsts::LABEL_NETWORK,
      topology.name);
  std::string intervalLabel = folly::sformat(
      PrometheusConsts::METRIC_FORMAT,
      PrometheusConsts::LABEL_DATA_INTERVAL,
      FLAGS_agg_time_period);
  std::unordered_map<std::string, thrift::Node> nodeNameMap{};
  for (const auto& node : topology.nodes) {
    onlineNodes += (node.status != thrift::NodeStatusType::OFFLINE);
    if (node.pop_node) {
      popNodes++;
    }
    nodeNameMap[node.name] = node;
    std::vector<std::string> nodeLabels = {
        networkLabel,
        intervalLabel,
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_NAME,
            PrometheusUtils::formatPrometheusKeyName(node.name)),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_IS_POP,
            node.pop_node ? "true" : "false"),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_IS_CN,
            node.node_type == thrift::NodeType::CN ? "true" : "false"),
    };
    // ensure mac_addr is set
    if (!node.mac_addr.empty()) {
      nodeLabels.emplace_back(folly::sformat(
          PrometheusConsts::METRIC_FORMAT,
          PrometheusConsts::LABEL_NODE_MAC,
          node.mac_addr));
    }
    // record status of node
    aggValues.emplace_back(Metric(
        "node_online",
        ts,
        nodeLabels,
        (int)(node.status != thrift::NodeStatusType::OFFLINE)));
  }
  std::vector<std::string> topologyLabels = {networkLabel, intervalLabel};
  aggValues.emplace_back(
      Metric("total_nodes", ts, topologyLabels, topology.nodes.size()));
  aggValues.emplace_back(
      Metric("online_nodes", ts, topologyLabels, onlineNodes));
  aggValues.emplace_back(Metric(
      "online_nodes_perc",
      ts,
      topologyLabels,
      (double)onlineNodes / topology.nodes.size() * 100.0));
  aggValues.emplace_back(Metric("pop_nodes", ts, topologyLabels, popNodes));

  // (wireless) links up + down
  int wirelessLinks = 0;
  int onlineLinks = 0;
  for (const auto& link : topology.links) {
    if (link.link_type != thrift::LinkType::WIRELESS) {
      continue;
    }
    wirelessLinks++;
    onlineLinks += link.is_alive;
    // check if either side of the link is a CN
    bool hasCnNode =
        (nodeNameMap.at(link.a_node_name).node_type == thrift::NodeType::CN ||
         nodeNameMap.at(link.z_node_name).node_type == thrift::NodeType::CN);
    // meta-data per link
    std::vector<std::string> linkMetaData = {
        networkLabel,
        intervalLabel,
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_LINK_NAME,
            PrometheusUtils::formatPrometheusKeyName(link.name)),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_IS_CN,
            hasCnNode ? "true" : "false")};
    // record link metrics
    aggValues.emplace_back(
        Metric("link_online", ts, linkMetaData, (int)(link.is_alive)));
    aggValues.emplace_back(
        Metric("link_attempts", ts, linkMetaData, link.linkup_attempts));
  }
  aggValues.emplace_back(
      Metric("total_wireless_links", ts, topologyLabels, wirelessLinks));
  aggValues.emplace_back(
      Metric("online_wireless_links", ts, topologyLabels, onlineLinks));
  aggValues.emplace_back(Metric(
      "online_wireless_links_perc",
      ts,
      topologyLabels,
      (double)onlineLinks / wirelessLinks * 100.0));
}

void AggregatorService::fetchAndLogWirelessControllerMetrics(
    std::vector<Metric>& aggValues,
    const query::TopologyConfig& topologyConfig) {
  if (topologyConfig.wireless_controller_ref() &&
      topologyConfig.wireless_controller_ref()->type == "ruckus") {
    fetchAndLogRuckusControllerMetrics(aggValues, topologyConfig);
  }
}

void AggregatorService::fetchAndLogRuckusControllerMetrics(
    std::vector<Metric>& aggValues,
    const query::TopologyConfig& topologyConfig) {
  const auto& wac = *topologyConfig.wireless_controller_ref();
  VLOG(1) << "Fetching metrics from ruckus controller: " << wac.url;
  folly::dynamic WirelessControllerStats =
      WirelessController::ruckusControllerStats(wac);
  // push AP metrics
  if (WirelessControllerStats.isObject()) {
    long ts = StatsUtils::getTimeInMs();
    for (const auto& wap : WirelessControllerStats.items()) {
      VLOG(2) << "\tAP: " << wap.first;
      std::vector<std::string> wapMetaData{folly::sformat(
          PrometheusConsts::METRIC_FORMAT,
          PrometheusConsts::LABEL_NETWORK,
          topologyConfig.name)};
      for (const auto& ruckusKey : wap.second.items()) {
        const std::string ruckusKeyName = ruckusKey.first.asString();
        // skip ruckus numeric labels and null values
        if (RUCKUS_SKIP_LABELS.count(ruckusKeyName) ||
            ruckusKey.second.isNull()) {
          continue;
        }
        VLOG(2) << "\tLabel: " << ruckusKey.first << " = " << ruckusKey.second;
        wapMetaData.emplace_back(folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            ruckusKeyName,
            PrometheusUtils::formatPrometheusKeyName(
                ruckusKey.second.asString())));
      }
      // metrics to report per-AP
      std::map<std::string, std::string> wapMetrics = {
          {"clientCount", "wap_client_count"}, {"uptime", "wap_uptime"}};
      for (const auto& wapMetric : wapMetrics) {
        auto wapMetricIt = wap.second.find(wapMetric.first);
        if (wapMetricIt != wap.second.items().end()) {
          aggValues.emplace_back(Metric(
              wapMetric.second, ts, wapMetaData, wapMetricIt->second.asInt()));
        }
      }
    }
  }
}

} // namespace gorilla
} // namespace facebook
