/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PyWriteHandler.h"
#include "../BeringeiClientStore.h"
#include "mysql_connection.h"
#include "mysql_driver.h"

#include <algorithm>
#include <utility>

#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/prepared_statement.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>
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

PyWriteHandler::PyWriteHandler(std::shared_ptr<MySqlClient> mySqlClient)
    : RequestHandler(), mySqlCacheClient_(mySqlClient) {
  mySqlClient_ = std::make_shared<MySqlClient>();
}

void PyWriteHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void PyWriteHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void PyWriteHandler::writeData(query::StatsWriteRequest request) {
  std::unordered_map<std::string, query::MySqlNodeData> unknownNodes;
  std::unordered_map<int64_t, std::unordered_set<std::string>> missingNodeKey;
  std::vector<DataPoint> bRows;

  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();

  int interval = request.interval;
  LOG(INFO) << "The agents are of mac: ";
  for (const auto& agent:request.agents){
    LOG(INFO) << agent.mac;
  }

  for (const auto& agent : request.agents) {
    auto nodeId = mySqlCacheClient_->getNodeId(agent.mac);
    if (!nodeId) {
      query::MySqlNodeData newNode;
      newNode.mac = agent.mac;
      newNode.network = request.topology.name;
      unknownNodes[newNode.mac] = newNode;
      LOG(INFO) << "Unknown mac: " << agent.mac;
      continue;
    }

    for (const auto& stat : agent.stats) {
      // check timestamp
      auto keyId = mySqlCacheClient_->getKeyId(*nodeId, stat.key);
      // verify node/key combo exists
      if (keyId) {
        // insert row for beringei
        DataPoint bRow;
        TimeValuePair timePair;
        Key bKey;

        bKey.key = std::to_string(*keyId);
        // Currently, all nms beringei DB IO is with shard 0
        // TODO: when finalized the common hash, change to hash shard id as:
        // std::hash<std::string>()(brow_tmp.key.key) % shardCount;
        bKey.shardId = 0;
        bRow.key = bKey;
        timePair.unixTime = stat.ts;
        timePair.value = stat.value;
        bRow.value = timePair;
        bRows.push_back(bRow);
      } else {
        VLOG(2) << "Missing cache for " << *nodeId << "/" << stat.key;
        missingNodeKey[*nodeId].insert(stat.key);
      }
    }
  }

  // write newly found macs and node/key combos
  // TODO: in the future, add a guard of the maximum number of allowed keys
  if (!unknownNodes.empty() || !missingNodeKey.empty()) {
    mySqlClient_->addNodes(unknownNodes);
    mySqlClient_->addStatKeys(missingNodeKey);
    LOG(INFO) << "Ran addNodes/addStatKeys, refreshing";
    mySqlCacheClient_->refreshAll();
  }

  // Log the number of bRows to put to the DB
  LOG(INFO) << "Rows to put to the Beringei DB: " << bRows.size();

  // insert rows
  if (!bRows.empty()) {
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiClient = beringeiClientStore->getWriteClient(interval);

    folly::EventBase eb;
    eb.runInLoop([this, beringeiClient, &bRows]() mutable {
      LOG(INFO) << "Key of the data point: " << bRows.back().key.key;
      auto pushedPoints = beringeiClient->putDataPoints(bRows);
      if (!pushedPoints) {
        LOG(ERROR) << "Failed to perform the put!";
      }
    });
    std::thread tEb([&eb]() { eb.loop(); });
    tEb.join();

    auto endTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();
    LOG(INFO) << "Writing stats complete. "
              << "Total: " << (endTime - startTime) << "ms.";
  } else {
    LOG(INFO) << "No stats data to write";
  }
}

void PyWriteHandler::onEOM() noexcept {

  auto body = body_->moveToFbString();
  query::StatsWriteRequest request;
  try {
    request = BinarySerializer::deserialize<query::StatsWriteRequest>(body);
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

void PyWriteHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void PyWriteHandler::requestComplete() noexcept {
  delete this;
}

void PyWriteHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new
  // Proxygen does not delete the handler.
  delete this;
}

void PyWriteHandler::logRequest(query::StatsWriteRequest request) {}
} // namespace gorilla
} // namespace facebook
