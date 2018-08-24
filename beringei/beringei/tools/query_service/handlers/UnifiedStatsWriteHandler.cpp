/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "UnifiedStatsWriteHandler.h"

#include "../BeringeiClientStore.h"
#include "../MySqlClient.h"
#include "../TopologyStore.h"

#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <proxygen/httpserver/ResponseBuilder.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <algorithm>
#include <utility>

using apache::thrift::BinarySerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;
using namespace proxygen;

namespace facebook {
namespace gorilla {

UnifiedStatsWriteHandler::UnifiedStatsWriteHandler() : RequestHandler() {}

void UnifiedStatsWriteHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // Do nothing
}

void UnifiedStatsWriteHandler::onBody(
    std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void UnifiedStatsWriteHandler::formatDataPoint(
    DataPoint* bRow,
    query::Stat stat,
    int keyId) {
  TimeValuePair timePair;
  Key bKey;

  // Currently, all NMS Beringei DB IO is with shard 0
  // TODO: when finalized the common hash, change to hash shard id as:
  // std::hash<std::string>()(brow_tmp.key.key) % shardCount;
  bKey.shardId = 0;
  bKey.key = std::to_string(keyId);
  bRow->key = bKey;
  timePair.unixTime = stat.ts;
  timePair.value = stat.value;
  bRow->value = timePair;
}

void UnifiedStatsWriteHandler::writeBeringeiDataPoints(
    std::vector<DataPoint>* bRows,
    int interval) {
  std::vector<DataPoint> bRowsCopy = *bRows;
  // Insert data points to Beringei database
  if (!bRowsCopy.empty()) {
    LOG(INFO) << "Begin entering " << bRowsCopy.size()
              << " rows of data points to Beringei database";
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiClient = beringeiClientStore->getWriteClient(interval);
    folly::EventBase eb;
    eb.runInLoop([this, beringeiClient, &bRowsCopy]() mutable {
      // After exec putDataPoints, bRowsCopy will be invalid
      auto pushedPoints = beringeiClient->putDataPoints(bRowsCopy);
      if (!pushedPoints) {
        LOG(ERROR) << "Failed to perform the put!";
      }
    });
    std::thread tEb([&eb]() { eb.loop(); });
    tEb.join();
  } else {
    LOG(INFO) << "No data points to write to Beringei database";
  }
}

void UnifiedStatsWriteHandler::writeAggData(
    query::UnifiedWriteRequest request,
    std::vector<DataPoint>* bRows) {
  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();

  if (!request.__isset.aggStats) {
    LOG(INFO) << "No aggregate stats specified in the input request";
    return;
  }

  for (const auto& aggStats : request.aggStats) {
    if (!aggStats.__isset.stats) {
      LOG(WARNING) << "No stats specified for topology"
                   << aggStats.topologyName;
      continue;
    }

    std::shared_ptr<query::TopologyConfig> topologyConfig;
    auto topologyInstance = TopologyStore::getInstance();
    try {
      topologyConfig = topologyInstance->getTopology(aggStats.topologyName);
    } catch (std::exception& e) {
      LOG(ERROR) << "Cannot found topology config with error " << e.what();
      LOG(ERROR) << "Skip aggregate stats writing of unknown topology "
                 << aggStats.topologyName;
      continue;
    }

    std::vector<std::string> missingAggKeys;
    int topologyId = topologyConfig->id;
    for (const auto& stat : aggStats.stats) {
      // Check if the aggregate key and topology combination exists
      auto it = topologyConfig->keys.find(stat.key);
      if (it != topologyConfig->keys.end()) {
        // Found the Beringei keyId for the aggregate stats of the topology
        int keyId = it->second;

        DataPoint bRow;
        formatDataPoint(&bRow, stat, keyId);
        bRows->push_back(bRow);
      } else {
        // Cannot find the keyId of the aggregate key
        VLOG(2) << "Missing cache for " << topologyId << "/" << stat.key;
        // Prepare to add the missing key to the MySQL table. Drop this batch
        // of aggregate data.
        missingAggKeys.push_back(stat.key);
      }
    }
    if (!missingAggKeys.empty()) {
      // Add the unknown aggregate stats key names to MySQL
      auto mySqlClient = MySqlClient::getInstance();
      mySqlClient->addAggKeys(topologyId, missingAggKeys);
      LOG(INFO) << "Added missing aggregate keys to MySQL with topologyId of "
                << topologyId;
    }
  }

  auto endTime = (int64_t)duration_cast<milliseconds>(
                     system_clock::now().time_since_epoch())
                     .count();
  LOG(INFO) << "Processing aggregate stats completed. "
            << "Total: " << (endTime - startTime) << "ms.";
}

void UnifiedStatsWriteHandler::writeNodeData(
    query::UnifiedWriteRequest request,
    std::vector<DataPoint>* bRows) {
  std::unordered_map<int64_t, std::unordered_set<std::string>> missingNodeKey;

  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();

  if (!request.__isset.nodeStats) {
    LOG(INFO) << "No node stats specified in the input request";
    return;
  }

  auto mySqlClient = MySqlClient::getInstance();
  for (const auto& nodeStats : request.nodeStats) {
    auto nodeId = mySqlClient->getNodeId(nodeStats.mac);
    if (!nodeId) {
      LOG(INFO) << "Dropping report for unknown mac: " << nodeStats.mac;
      continue;
    }

    for (const auto& stat : nodeStats.stats) {
      auto keyId = mySqlClient->getKeyId(*nodeId, stat.key);
      // verify node/key combo exists
      if (keyId) {
        DataPoint bRow;
        formatDataPoint(&bRow, stat, *keyId);
        bRows->push_back(bRow);
      } else {
        VLOG(2) << "Missing cache for " << *nodeId << "/" << stat.key;
        missingNodeKey[*nodeId].insert(stat.key);
      }
    }
  }
  // write new keys to mysql
  // TODO: in the future, add a guard of the maximum number of allowed keys
  if (!missingNodeKey.empty()) {
    auto mySqlClient = MySqlClient::getInstance();
    mySqlClient->addStatKeys(missingNodeKey);
    LOG(INFO) << "Ran addStatKeys, refreshing";
    mySqlClient->refreshAll();
  }

  auto endTime = (int64_t)duration_cast<milliseconds>(
                     system_clock::now().time_since_epoch())
                     .count();
  LOG(INFO) << "Processing node stats completed. "
            << "Total: " << (endTime - startTime) << "ms.";
}

void UnifiedStatsWriteHandler::onEOM() noexcept {
  auto body = body_->moveToFbString();
  query::UnifiedWriteRequest request;
  try {
    LOG(INFO) << "Using binary protocol for request deserialization";
    request = BinarySerializer::deserialize<query::UnifiedWriteRequest>(body);
  } catch (const std::exception&) {
    LOG(INFO) << "Error deserializing stats writer request";
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("UnifiedStatsWriteHandler", "failure")
        .body("Failed to de-serialize stats writer request")
        .sendWithEOM();
    return;
  }
  LOG(INFO) << "Start writing node and aggregate stats";

  try {
    std::vector<DataPoint>* bRows = new std::vector<DataPoint>();
    writeNodeData(request, bRows);
    writeAggData(request, bRows);

    auto intervals = request.intervals;
    for (const auto& interval : intervals) {
      // Insert node and aggregate stats to the Beringei database
      LOG(INFO) << "Save a copy to the Beringei " << interval
                << "s data database";
      writeBeringeiDataPoints(bRows, interval);
    }

    delete bRows;
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to handle stats writer request, " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("UnifiedStatsWriteHandler", "failure")
        .body("Failed handling stats writer request")
        .sendWithEOM();
    return;
  }

  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("UnifiedStatsWriteHandler", "success")
      .body("Success")
      .sendWithEOM();
}

void UnifiedStatsWriteHandler::onUpgrade(
    UpgradeProtocol /* unused */) noexcept {}

void UnifiedStatsWriteHandler::requestComplete() noexcept {
  delete this;
}

void UnifiedStatsWriteHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
