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
#include "MySqlClient.h"
#include "TopologyStore.h"

#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"

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

AggregatorService::AggregatorService(
  TACacheMap& typeaheadCache)
    : typeaheadCache_(typeaheadCache) {
  // stats reporting time period
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  timer_->scheduleTimeout(FLAGS_agg_time_period * 1000);

  // fetch ruckus data less frequently
  /*  ruckusTimer_ = folly::AsyncTimeout::make(eb_, [&] () noexcept {
      ruckusControllerCb();
    });
    ruckusTimer_->scheduleTimeout(FLAGS_ruckus_controller_time_period * 1000);*/
}

void AggregatorService::ruckusControllerStats() {
  std::unordered_map<std::string, double> ruckusValues;
  // login and get a new session id
  LOG(INFO) << "Ruckus controller stats fetch running...";
  folly::dynamic loginObj =
      folly::dynamic::object("username", "admin")("password", "Terra@171");
  struct CurlResponse loginResp = ruckusController_.ruckusControllerRequest(
      "session", "", folly::toJson(loginObj));
  VLOG(1) << "Header: " << loginResp.header << ", body: " << loginResp.body;
  // find the cookie string
  std::string cookieStr;
  std::vector<folly::StringPiece> pieces;
  folly::split("\n", loginResp.header, pieces);
  for (const auto& piece : pieces) {
    if (piece.startsWith("Set-Cookie: JSESSIONID")) {
      size_t cookieLen = 12;
      cookieStr = piece.subpiece(cookieLen, piece.find(";") - cookieLen).str();
    }
  }
  if (cookieStr.empty()) {
    LOG(ERROR) << "Unable to login to ruckus controller, response code: "
               << loginResp.responseCode;
    return;
  }
  // fetch ap list
  struct CurlResponse apListResp =
      ruckusController_.ruckusControllerRequest("aps", cookieStr, "");
  if (apListResp.responseCode != 200) {
    LOG(ERROR) << "Unable to fetch AP list, response code: "
               << apListResp.responseCode;
    return;
  }
  folly::dynamic apListObj = folly::parseJson(apListResp.body);
  auto apListObjIt = apListObj.find("list");
  if (apListObjIt != apListObj.items().end()) {
    long totalClientCount = 0L;
    for (const auto& apItem : apListObjIt->second) {
      std::string apName = apItem["name"].asString();
      std::string macAddr = apItem["mac"].asString();
      // fetch details for each ap
      struct CurlResponse apDetailsResp =
          ruckusController_.ruckusControllerRequest(
              folly::sformat("aps/{}/operational/summary", macAddr),
              cookieStr,
              "");
      folly::dynamic apDetailsObj = folly::parseJson(apDetailsResp.body);
      try {
        long apUptime = apDetailsObj["uptime"].asInt();
        long clientCount = apDetailsObj["clientCount"].asInt();
        totalClientCount += clientCount;
        std::string registrationState(
            apDetailsObj["registrationState"].asString());
        std::string administrativeState(
            apDetailsObj["administrativeState"].asString());
        std::string ipAddr(apDetailsObj["externalIp"].asString());
        LOG(INFO) << "AP: " << apName << ", MAC: " << macAddr
                  << ", uptime: " << apUptime
                  << ", reg state: " << registrationState
                  << ", client count: " << clientCount
                  << ", admin state: " << administrativeState
                  << ", ip: " << ipAddr;
        // add client count reporting for each AP MAC
        // TODO - should this be site name?
        ruckusValues[folly::sformat("ruckus.{}.client_count", macAddr)] =
            clientCount;
      } catch (const folly::TypeError& error) {
        LOG(ERROR) << "\tType-error: " << error.what();
        for (const auto& apDetailsItem : apDetailsObj.items()) {
          LOG(INFO) << "\t\t" << apDetailsItem.first << " = "
                    << apDetailsItem.second;
        }
      }
    }
    ruckusValues["ruckus.total_client_count"] = totalClientCount;
    LOG(INFO) << "Total client count: " << totalClientCount;
  }
  // swap stats pointer
  ruckusStats_.wlock()->swap(ruckusValues);
}

void AggregatorService::ruckusControllerCb() {
  //  std::thread ruckusThread([this]() {
  ruckusControllerStats();
  //  });
  ruckusTimer_->scheduleTimeout(FLAGS_ruckus_controller_time_period * 1000);
}

void AggregatorService::timerCb() {
  LOG(INFO) << "Aggregator running.";
  timer_->scheduleTimeout(FLAGS_agg_time_period * 1000);
  // run some aggregation
  std::unordered_map<std::string /* key name */, double> aggValues;
  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();
  for (const auto& topologyConfig : topologyList) {
    LOG(INFO) << "\tTopology: " << topologyConfig.first;
    auto topology = topologyConfig.second->topology;
    if (!topology.name.empty() && !topology.nodes.empty() &&
        !topology.links.empty()) {
      int64_t timeStamp =
          folly::to<int64_t>(ceil(std::time(nullptr) / 30.0)) * 30;
      // pop traffic
      std::unordered_set<std::string> popNodes;
      // nodes up + down
      int onlineNodes = 0;
      for (const auto& node : topology.nodes) {
        onlineNodes += (node.status != query::NodeStatusType::OFFLINE);
        if (node.pop_node) {
          popNodes.insert(node.name);
        }
        // for each pop, sum all terra links
      }
      aggValues["total_nodes"] = topology.nodes.size();
      aggValues["online_nodes"] = onlineNodes;
      aggValues["online_nodes_perc"] =
          (double)onlineNodes / topology.nodes.size() * 100.0;
      aggValues["pop_nodes"] = popNodes.size();

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
      aggValues["total_wireless_links"] = wirelessLinks;
      aggValues["online_wireless_links"] = onlineLinks;
      aggValues["online_wireless_links_perc"] =
          (double)onlineLinks / wirelessLinks * 100.0;
      // ruckus controller stats
      {
        auto ruckusStats = ruckusStats_.rlock();
        for (const auto& ruckusStat : *ruckusStats) {
          aggValues[ruckusStat.first] = ruckusStat.second;
        }
      }
      // report metrics somewhere? TBD
      VLOG(1) << "--------------------------------------";
      std::vector<DataPoint> bDataPoints;
      // query metric data from beringei
      {
        auto locked = typeaheadCache_.rlock();
        auto taCacheIt = locked->find(topology.name);
        if (taCacheIt != locked->cend()) {
          VLOG(1) << "Cache found for: " << topology.name;
          // fetch back the metrics we care about (PER, MCS?)
          // and average the values
          // buildQuery(aggValues, popNodes, taCacheIt->second);
          for (const auto& metric : aggValues) {
            VLOG(1) << "Agg: " << metric.first << " = "
                    << std::to_string(metric.second) << ", ts: " << timeStamp;
          }
          // find metrics, update beringei
          std::unordered_set<std::string> aggMetricNamesToAdd;
          for (const auto& metric : aggValues) {
            auto topologyAggKeyIt =
                topologyConfig.second->keys.find(metric.first);
            if (topologyAggKeyIt == topologyConfig.second->keys.end()) {
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
            bTimePair.unixTime = timeStamp;
            bTimePair.value = metric.second;
            bDataPoint.value = bTimePair;
            bDataPoints.push_back(bDataPoint);
          }
          if (!aggMetricNamesToAdd.empty()) {
            std::vector<std::string> aggMetricNamesToAddVector(
                aggMetricNamesToAdd.begin(), aggMetricNamesToAdd.end());
            auto mySqlClient = MySqlClient::getInstance();
            mySqlClient->addAggKeys(
                topologyConfig.second->id, aggMetricNamesToAddVector);
          }
        } else {
          LOG(ERROR) << "Missing type-ahead cache for: " << topology.name;
        }
      }
      if (FLAGS_write_agg_data) {
        int dpCount = bDataPoints.size();
        if (!dpCount) {
          // no data points to write
          continue;
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
    } else {
      LOG(INFO) << "Invalid topology";
    }
  }
}
/*
TODO - disabled until the new structure is in use. These keys aren't in use yet
void AggregatorService::buildQuery(
    std::unordered_map<std::string, double>& values,
    const std::unordered_set<std::string>& popNodeNames,
    const std::shared_ptr<StatsTypeAheadCache> cache) {
  // build queries
  query::QueryRequest queryRequest;
  std::vector<stats::QueryRequest> query;
  std::vector<std::string> keyNames = {"per", "mcs", "snr", "rssi"};
  for (const auto& keyName : keyNames) {
    auto keyData = cache->getKeyData(keyName);
    query::Query query;
    query.type = "latest";
    std::vector<int64_t> keyIds;
    std::vector<stats::KeyMetaData> keyDataRenamed;
    for (const auto& key : keyData) {
      keyIds.push_back(key.keyId);
      auto newKeyData = key;
      newKeyData.linkName = key.linkName;
      // TODO - set peer name?
      keyDataRenamed.push_back(newKeyData);
    }
    query.key_ids = keyIds;
    query.data = keyDataRenamed;
    query.min_ago = 5;
    query.__isset.min_ago = true;
    queries.push_back(query);
  }
  // pop-specific keys
  static const std::vector<std::string> popKeyNames = {"tx_bytes", "rx_bytes"};
  keyNames.insert(keyNames.end(), popKeyNames.begin(), popKeyNames.end());
  for (const auto& keyName : popKeyNames) {
    auto keyData = cache->getKeyData(keyName);
    query::Query query;
    query.type = "latest";
    std::vector<int64_t> keyIds;
    std::vector<query::KeyMetaData> keyDataRenamed;
    // restrict to pop nodes
    for (const auto& key : keyData) {
      if (!popNodeNames.count(key.nodeName)) {
        continue;
      }
      LOG(INFO) << "Key: " << key.key << ", id: " << key.keyId
                << ", node: " << key.node << ", name: " << key.nodeName
                << ", unit: " << (int)key.unit;
      keyIds.push_back(key.keyId);
      auto newKeyData = key;
      newKeyData.linkName = key.linkName;
      // TODO - set peer name?
      keyDataRenamed.push_back(newKeyData);
    }
    query.key_ids = keyIds;
    query.data = keyDataRenamed;
    query.min_ago = 5;
    query.__isset.min_ago = true;
    queries.push_back(query);
  }
  // fetch the last few minutes to receive the latest data point
  queryRequest.queries = queries;
  BeringeiData dataFetcher(queryRequest);
  folly::dynamic results = dataFetcher.process();
  int queryIdx = 0;
  // iterate over the results - the displayName is the key
  for (const auto& query : results) {
    double sum = 0;
    int items = 0;
    for (const auto& pair : query.items()) {
      VLOG(1) << "Name: " << pair.first
              << ", value: " << pair.second.asDouble();
      sum += pair.second.asDouble();
      items++;
    }
    double avg = sum / items;
    // prefix keys with pop
    std::string keyNameSum = "pop." + keyNames[queryIdx];
    values[keyNameSum] = sum;
    queryIdx++;
  }
}*/

void AggregatorService::start() {
  eb_.loopForever();
}

} // namespace gorilla
} // namespace facebook
