/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "AggregatorService.h"

#include "BeringeiClientStore.h"
#include "BeringeiReader.h"
#include "MySqlClient.h"
#include "TopologyStore.h"

#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"

#include <cmath>
#include <curl/curl.h>
#include <folly/String.h>
#include <folly/io/async/AsyncTimeout.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_int32(agg_time_period, 30, "Beringei time period");
DEFINE_int32(
    ruckus_controller_time_period,
    30,
    "Ruckus controller stats fetch time period");
DEFINE_bool(write_agg_data, true, "Write aggregator data to beringei");

using std::chrono::duration_cast;
using std::chrono::seconds;
using std::chrono::system_clock;

extern "C" {
struct HTTPDataStruct {
  char* data;
  size_t size;
};

static size_t
curlWriteCb(void* content, size_t size, size_t nmemb, void* userp) {
  size_t realSize = size * nmemb;
  struct HTTPDataStruct* httpData = (struct HTTPDataStruct*)userp;
  httpData->data =
      (char*)realloc(httpData->data, httpData->size + realSize + 1);
  if (httpData->data == nullptr) {
    printf("Unable to allocate memory (realloc failed)\n");
    return 0;
  }
  memcpy(&(httpData->data[httpData->size]), content, realSize);
  httpData->size += realSize;
  httpData->data[httpData->size] = 0;
  return realSize;
}
}

using apache::thrift::SimpleJSONSerializer;

namespace facebook {
namespace gorilla {

AggregatorService::AggregatorService(TACacheMap& typeaheadCache)
    : typeaheadCache_(typeaheadCache) {
  // stats reporting time period
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  timer_->scheduleTimeout(FLAGS_agg_time_period * 1000);
}

void AggregatorService::start() {
  eb_.loopForever();
}

void AggregatorService::timerCb() {
  LOG(INFO) << "Aggregator running.";
  timer_->scheduleTimeout(FLAGS_agg_time_period * 1000);
  doPeriodicWork();
}

void AggregatorService::doPeriodicWork() {
  std::unordered_map<std::string /* key name */, std::pair<time_t, double>>
      aggValues;
  std::vector<DataPoint> bDataPoints;
  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();
  for (const auto& topologyConfig : topologyList) {
    auto topology = topologyConfig.second->topology;
    fetchAndLogTopologyMetrics(aggValues, topology);
    // create data points from metric data in beringei format
    createDataPoints(bDataPoints, aggValues, topologyConfig.second);
  }
  // store metrics to beringei
  storeAggregateMetrics(bDataPoints);
}

void AggregatorService::fetchAndLogTopologyMetrics(
    std::unordered_map<std::string /* key name */,
                       std::pair<time_t, double>>& aggValues,
    const query::Topology& topology) {
  LOG(INFO) << "\tTopology: " << topology.name;
  if (topology.name.empty() || topology.nodes.empty() ||
      topology.links.empty()) {
    LOG(INFO) << "Invalid topology";
    return;
  }
  // nodes up + down
  int onlineNodes = 0;
  int popNodes = 0;
  for (const auto& node : topology.nodes) {
    onlineNodes += (node.status != query::NodeStatusType::OFFLINE);
    if (node.pop_node) {
      popNodes++;
    }
  }
  aggValues["total_nodes"] = std::make_pair(0, topology.nodes.size());
  aggValues["online_nodes"] = std::make_pair(0, onlineNodes);
  aggValues["online_nodes_perc"] = std::make_pair(0,
      (double)onlineNodes / topology.nodes.size() * 100.0);
  aggValues["pop_nodes"] = std::make_pair(0, popNodes);

  // (wireless) links up + down
  int wirelessLinks = 0;
  int onlineLinks = 0;
  for (const auto& link : topology.links) {
    if (link.link_type != query::LinkType::WIRELESS) {
      continue;
    }
    wirelessLinks++;
    onlineLinks += link.is_alive;
  }
  aggValues["total_wireless_links"] = std::make_pair(0, wirelessLinks);
  aggValues["online_wireless_links"] = std::make_pair(0, onlineLinks);
  aggValues["online_wireless_links_perc"] = std::make_pair(0,
      (double)onlineLinks / wirelessLinks * 100.0);
}

void AggregatorService::createDataPoints(
    std::vector<DataPoint>& bDataPoints,
    const std::unordered_map<std::string /* key name */,
                             std::pair<time_t, double>>& aggValues,
    std::shared_ptr<query::TopologyConfig> topologyConfig) {
  VLOG(1) << "--------------------------------------";
  int64_t timeStamp =
      folly::to<int64_t>(ceil(std::time(nullptr) / 30.0)) * 30;
  // query metric data from beringei
  {
    auto locked = typeaheadCache_.rlock();
    auto taCacheIt = locked->find(topologyConfig->topology.name);
    if (taCacheIt != locked->cend()) {
      VLOG(1) << "Cache found for: " << topologyConfig->topology.name;
      // find metrics, update beringei
      std::unordered_set<std::string> aggMetricNamesToAdd;
      for (const auto& metric : aggValues) {
        VLOG(1) << "Agg: " << metric.first << " = "
                << std::to_string(metric.second.second) << ", ts: " << metric.second.first;
        auto topologyAggKeyIt =
            topologyConfig->keys.find(metric.first);
        if (topologyAggKeyIt == topologyConfig->keys.end()) {
          // add key name to db
          aggMetricNamesToAdd.insert(metric.first);
          LOG(INFO) << "Missing key name: " << metric.first;
          continue;
        }
        int keyId = topologyAggKeyIt->second;
        // create beringei data-point
        DataPoint bDataPoint;
        TimeValuePair bTimePair;
        Key bKey;

        bKey.key = std::to_string(keyId);
        bDataPoint.key = bKey;
        // use timestamp of metric if non-zero, otherwise use current time
        bTimePair.unixTime = metric.second.first == 0 ? timeStamp :
                                                        metric.second.first;
        bTimePair.value = metric.second.second;
        bDataPoint.value = bTimePair;
        bDataPoints.push_back(bDataPoint);
      }
      if (!aggMetricNamesToAdd.empty()) {
        std::vector<std::string> aggMetricNamesToAddVector(
            aggMetricNamesToAdd.begin(), aggMetricNamesToAdd.end());
        auto mySqlClient = MySqlClient::getInstance();
        mySqlClient->addAggKeys(
            topologyConfig->id, aggMetricNamesToAddVector);
      }
    } else {
      LOG(ERROR) << "Missing type-ahead cache for: " << topologyConfig->topology.name;
    }
  }
}

void AggregatorService::storeAggregateMetrics(
    std::vector<DataPoint>& bDataPoints) {
  // write data to 30-second interval DS if enabled
  if (FLAGS_write_agg_data) {
    int dpCount = bDataPoints.size();
    if (!dpCount) {
      // no data points to write
      return;
    }
    folly::EventBase eb;
    eb.runInLoop([this, &bDataPoints]() mutable {
      auto beringeiClientStore = BeringeiClientStore::getInstance();
      auto beringeiWriteClient = beringeiClientStore->getWriteClient(30);
      auto pushedPoints = beringeiWriteClient->putDataPoints(bDataPoints);
      if (!pushedPoints) {
        LOG(ERROR) << "Failed to perform the put!";
      }
    });
    std::thread tEb([&eb]() { eb.loop(); });
    tEb.join();
    LOG(INFO) << dpCount << " aggregate data-points written.";
  }
}

} // namespace gorilla
} // namespace facebook
