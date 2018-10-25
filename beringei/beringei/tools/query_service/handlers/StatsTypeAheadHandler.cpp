/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "StatsTypeAheadHandler.h"
#include "../MySqlClient.h"

#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/prepared_statement.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>
#include <folly/Conv.h>
#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <proxygen/httpserver/ResponseBuilder.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <algorithm>
#include <map>
#include <utility>

using apache::thrift::BinarySerializer;
using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;
using namespace proxygen;

namespace facebook {
namespace gorilla {

// RequestSourceType_ denotes the source of incoming HTTPMessage
// If enableBinarySerialization, use Binary protocol to deserialize request
// Otherwise, use SimpleJSON protocol to deserialize request
StatsTypeAheadHandler::StatsTypeAheadHandler(
    TACacheMap& typeaheadCache,
    bool enableBinarySerialization)
    : RequestHandler(),
      typeaheadCache_(typeaheadCache),
      enableBinarySerialization_(enableBinarySerialization) {}

void StatsTypeAheadHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void StatsTypeAheadHandler::onBody(
    std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void StatsTypeAheadHandler::onEOM() noexcept {
  if (!body_ || body_->length() < 2) {
    ResponseBuilder(downstream_).status(400, "Empty Request").sendWithEOM();
    return;
  }
  auto byteRange = body_->coalesce();
  std::string body(byteRange.begin(), byteRange.end());
  stats::TypeaheadRequest request;
  try {
    if (enableBinarySerialization_) {
      LOG(INFO) << "Using Binary protocol for TypeaheadRequest"
                << "deserialization.";
      request = BinarySerializer::deserialize<stats::TypeaheadRequest>(body);
    } else {
      LOG(INFO) << "Using SimpleJSON protocol for TypeaheadRequest"
                << "deserialization.";
      request =
          SimpleJSONSerializer::deserialize<stats::TypeaheadRequest>(body);
    }
  } catch (const std::exception& ex) {
    LOG(INFO) << "Error deserializing stats type ahead request";
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("Content-Type", "application/json")
        .body("Failed de-serializing stats type ahead request")
        .sendWithEOM();
    return;
  }

  // returns false if the key is not on the restrictor list or if there is
  // no restrictor list
  auto checkRestrictors = [&request](const stats::KeyMetaData& keyData) {
    bool skipKey = false;
    for (const auto& restrictor : request.restrictors) {
      std::unordered_set<std::string> restrictorList(
          restrictor.values.begin(), restrictor.values.end());
      if (restrictor.restrictorType == stats::RestrictorType::NODE &&
          !restrictorList.count(keyData.srcNodeName) &&
          !restrictorList.count(keyData.srcNodeMac)) {
        if (request.debugLogToConsole) {
          LOG(INFO) << "\t\tSkipping node: " << keyData.srcNodeName;
        }
        skipKey = true;
        break;
      }
      if (restrictor.restrictorType == stats::RestrictorType::LINK &&
          !restrictorList.count(keyData.linkName)) {
        if (request.debugLogToConsole) {
          LOG(INFO) << "\t\tSkipping link: " << keyData.linkName;
        }
        skipKey = true;
        break;
      }
    }
    return skipKey;
  };

  folly::dynamic orderedMetricList = folly::dynamic::array;
  if (request.typeaheadType == stats::TypeaheadType::TOPOLOGYNAME) {
    auto mySqlClient = MySqlClient::getInstance();
    for (const auto topologyConfig : mySqlClient->getTopologyConfigs()) {
      orderedMetricList.push_back(topologyConfig.second->name);
    }
  } else if (request.__isset.topologyName) {
    // check for cache client
    auto locked = typeaheadCache_.rlock();
    auto taIt = locked->find(request.topologyName);
    if (taIt == locked->cend()) {
      LOG(ERROR) << "No type-ahead cache for \"" << request.topologyName
                 << "\"";
      ResponseBuilder(downstream_)
          .status(500, "Internal Server Error")
          .header("Content-Type", "application/json")
          .body("No type-ahead cache found")
          .sendWithEOM();
      return;
    }
    // this loop can be pretty lengthy so holding a lock the whole time isn't
    // ideal
    auto taCache = taIt->second;
    if (request.typeaheadType == stats::TypeaheadType::NODENAME) {
      LOG(INFO) << "Stats type ahead request on \"" << request.topologyName
                << "\"";
      if (request.__isset.restrictors && !request.restrictors.empty() &&
          !request.restrictors[0].values.empty()) {
        const auto nodeAstr = request.restrictors[0].values[0];
        orderedMetricList =
            std::move(taCache->listNodes(nodeAstr, request.topologyName));
      } else {
        orderedMetricList = std::move(taCache->listNodes());
      }
      locked.unlock();
    } else if (request.__isset.searchTerm) {
      LOG(INFO) << "Stats type ahead request for \"" << request.searchTerm
                << "\" on \"" << request.topologyName << "\"";
      auto retMetrics = taCache->searchMetrics(request.searchTerm);
      locked.unlock();

      if (request.typeaheadType == stats::TypeaheadType::KEYNAME) {
        // return is in format
        // [[{},{}],[{},{}]]  outer array is per metric (e.g. 'rssi')
        // inner array is every key for that metric (e.g.
        // tgf.<MAC>.phystatus.srssi)
        for (const auto& metricList : retMetrics) {
          folly::dynamic keyList = folly::dynamic::array;
          for (const auto& key : metricList) {
            if (!checkRestrictors(key)) {
              VLOG(1) << "\t\tName: " << key.keyName << ", key: " << key.keyId
                      << ", node: " << key.srcNodeMac;
              keyList.push_back(folly::dynamic::object("keyId", key.keyId)(
                  "keyName", key.keyName)("shortName", key.shortName)(
                  "srcNodeMac", key.srcNodeMac)("srcNodeName", key.srcNodeName)(
                  "peerNodeMac", key.peerNodeMac)("linkName", key.linkName)(
                  "linkDirection", (int)key.linkDirection)(
                  "unit", (int)key.unit));
            }
          }
          // add to json
          if (!keyList.empty()) {
            orderedMetricList.push_back(keyList);
          }
        }
      }
    }
  }
  // build type-ahead list
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("Content-Type", "application/json")
      .body(folly::toJson(orderedMetricList))
      .sendWithEOM();
}

void StatsTypeAheadHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void StatsTypeAheadHandler::requestComplete() noexcept {
  delete this;
}

void StatsTypeAheadHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}
} // namespace gorilla
} // namespace facebook
