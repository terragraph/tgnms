/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "StatsWriteHandler.h"

#include "../BeringeiClientStore.h"
#include "../BeringeiReader.h"
#include "../MySqlClient.h"
#include "../PrometheusUtils.h"
#include "mysql_connection.h"
#include "mysql_driver.h"

#include <algorithm>
#include <utility>

#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/prepared_statement.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>
#include <curl/curl.h>
#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <proxygen/httpserver/ResponseBuilder.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

using apache::thrift::BinarySerializer;
using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;
using namespace proxygen;

namespace facebook {
namespace gorilla {

StatsWriteHandler::StatsWriteHandler(TACacheMap& typeaheadCache,
                                     bool enableBinarySerialization)
    : RequestHandler(),
      typeaheadCache_(typeaheadCache),
      enableBinarySerialization_(enableBinarySerialization) {}

void StatsWriteHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void StatsWriteHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

int64_t timeCalc(int64_t timeIn, int32_t intervalSec) {
  int64_t currentTime = std::time(nullptr);
  int64_t timeDiff = currentTime - timeIn;
  const int64_t k5min = 5 * 60;
  if (timeDiff > k5min || timeDiff < -k5min) {
    VLOG(2) << "Timestamp " << timeIn
            << " is out of sync with current time " << currentTime;
    timeIn = currentTime;
  }
  // Align timestamp to interval boundary
  return folly::to<int64_t>(floor(timeIn / intervalSec)) * intervalSec;
}

void StatsWriteHandler::writeData(const query::StatsWriteRequest& request) {
  std::unordered_map<int64_t, std::unordered_set<std::string>> missingNodeKey;
  std::vector<DataPoint> bRows;
  int interval = request.interval;
  auto startTime = BeringeiReader::getTimeInMs();
  auto mySqlClient = MySqlClient::getInstance();
  for (const auto& agent : request.agents) {
    auto nodeId = mySqlClient->getNodeId(agent.mac);
    if (!nodeId) {
      LOG(INFO) << "Dropping report for unknown mac: " << agent.mac;
      continue;
    }

    for (const auto& stat : agent.stats) {
      // tag short name
      int64_t tsParsed = timeCalc(stat.ts, interval);
      auto keyId = mySqlClient->getKeyId(*nodeId, stat.key);
      // verify node/key combo exists
      if (keyId) {
        // insert row for beringei
        DataPoint bRow;
        TimeValuePair timePair;
        Key bKey;

        // Currently, all NMS Beringei DB IO is with shard 0
        // TODO: when finalized the common hash, change to hash shard id as:
        // std::hash<std::string>()(brow_tmp.key.key) % shardCount;
        bKey.shardId = 0;
        bKey.key = std::to_string(*keyId);
        bRow.key = bKey;
        timePair.unixTime = tsParsed;
        timePair.value = stat.value;
        bRow.value = timePair;
        bRows.push_back(bRow);
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

  // insert rows
  if (!bRows.empty()) {
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

    auto endTime = BeringeiReader::getTimeInMs();
    LOG(INFO) << "Writing stats complete. "
              << "Total: " << (endTime - startTime) << "ms.";
  } else {
    LOG(INFO) << "No stats data to write";
  }
  PrometheusUtils::writeNodeMetrics(typeaheadCache_, request);
}

void StatsWriteHandler::onEOM() noexcept {
  auto body = body_->moveToFbString();
  query::StatsWriteRequest request;
  try {
    if (enableBinarySerialization_) {
      VLOG(2) << "Using Binary protocol for TypeAheadRequest"
              << "deserialization.";
      request = BinarySerializer::deserialize<query::StatsWriteRequest>(body);
    } else {
      VLOG(2) << "Using SimpleJSON protocol for TypeAheadRequest"
              << "deserialization.";
      request =
          SimpleJSONSerializer::deserialize<query::StatsWriteRequest>(body);
    }
  } catch (const std::exception&) {
    LOG(INFO) << "Error deserializing stats_writer request";
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("Content-Type", "application/json")
        .body("Failed de-serializing stats_writer request")
        .sendWithEOM();
    return;
  }
  logRequest(request);
  LOG(INFO) << "Stats writer request from \"" << request.topology.name
            << "\" for " << request.agents.size() << " nodes with "
            << request.interval << " second interval.";

  try {
    writeData(request);
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to handle stats_writer request: " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("Content-Type", "application/json")
        .body("Failed handling stats_writer request")
        .sendWithEOM();
    return;
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("Content-Type", "application/json")
      .body("Success")
      .sendWithEOM();
}

void StatsWriteHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void StatsWriteHandler::requestComplete() noexcept {
  delete this;
}

void StatsWriteHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

void StatsWriteHandler::logRequest(const query::StatsWriteRequest& request) {}

} // namespace gorilla
} // namespace facebook
