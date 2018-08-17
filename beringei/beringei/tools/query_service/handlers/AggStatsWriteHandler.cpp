/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "AggStatsWriteHandler.h"

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

AggStatsWriteHandler::AggStatsWriteHandler() : RequestHandler() {}

void AggStatsWriteHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // Do nothing
}

void AggStatsWriteHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void AggStatsWriteHandler::writeBeringeiDataPoints(
    std::vector<DataPoint> bRows,
    int interval) {
  // Insert data points to Beringei database
  if (!bRows.empty()) {
    LOG(INFO) << "Begin entering " << bRows.size()
              << " rows of data points to Beringei database";
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiClient = beringeiClientStore->getWriteClient(interval);
    folly::EventBase eb;
    eb.runInLoop([this, beringeiClient, &bRows]() mutable {
      auto pushedPoints = beringeiClient->putDataPoints(bRows);
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

void AggStatsWriteHandler::writeData(query::UnifiedWriteRequest request) {
  std::vector<DataPoint> bRows;

  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();

  if (!request.__isset.aggStats) {
    LOG(WARNING) << "No aggregate stats specified in the input request";
    return;
  }

  int interval = request.interval;
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
        // Prepare aggregate stats to be entered to Beringei database
        DataPoint bRow;
        TimeValuePair timePair;
        Key bKey;

        // Currently, all NMS Beringei database is on shard 0
        // TODO: after finalizing the common hash, change to hash shard id as:
        // std::hash<std::string>()(brow_tmp.key.key) % shardCount;
        int64_t tsParsed =
            folly::to<int64_t>(ceil(stat.ts / interval)) * interval;
        bKey.shardId = 0;
        bKey.key = std::to_string(keyId);
        bRow.key = bKey;
        timePair.unixTime = tsParsed;
        timePair.value = stat.value;
        bRow.value = timePair;
        bRows.push_back(bRow);
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

  writeBeringeiDataPoints(bRows, interval);
  auto endTime = (int64_t)duration_cast<milliseconds>(
                     system_clock::now().time_since_epoch())
                     .count();
  LOG(INFO) << "Writing aggregate stats complete. "
            << "Total: " << (endTime - startTime) << "ms.";
}

void AggStatsWriteHandler::onEOM() noexcept {
  auto body = body_->moveToFbString();
  query::UnifiedWriteRequest request;
  try {
    LOG(INFO) << "Using binary protocol for request deserialization";
    request = BinarySerializer::deserialize<query::UnifiedWriteRequest>(body);
  } catch (const std::exception&) {
    LOG(INFO) << "Error deserializing aggregate stats writer request";
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("AggregateSriteStatsHandler", "failure")
        .body("Failed to de-serialize aggregate stats writer request")
        .sendWithEOM();
    return;
  }
  LOG(INFO) << "Aggregate stats writer request for " << request.aggStats.size()
            << " topologies to Beringei database with " << request.interval
            << " second interval.";

  try {
    writeData(request);
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to handle aggregate stats writer request, "
               << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("AggregateSriteStatsHandler", "failure")
        .body("Failed handling aggregate stats writer request")
        .sendWithEOM();
    return;
  }

  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("AggregateSriteStatsHandler", "success")
      .body("Success")
      .sendWithEOM();
}

void AggStatsWriteHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void AggStatsWriteHandler::requestComplete() noexcept {
  delete this;
}

void AggStatsWriteHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
