/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "StatsHandler.h"

#include "../BeringeiReader.h"

#include <utility>

#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <proxygen/httpserver/ResponseBuilder.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;
using namespace facebook::stats;
using namespace proxygen;

namespace facebook {
namespace gorilla {

StatsHandler::StatsHandler(TACacheMap& typeaheadCache)
    : RequestHandler(),
      typeaheadCache_(typeaheadCache) {}

void StatsHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void StatsHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void StatsHandler::onEOM() noexcept {
  if (!body_ || body_->empty()) {
    ResponseBuilder(downstream_).status(400, "Empty Request").sendWithEOM();
    return;
  }
  auto byteRange = body_->coalesce();
  std::string body(byteRange.begin(), byteRange.end());
  stats::QueryRequest request;
  try {
    request = SimpleJSONSerializer::deserialize<stats::QueryRequest>(body);
    LOG(INFO) << "Topo: " << request.topologyName
              << ", key names: " << request.keyNames.size()
              << ", aggregation: " << _GraphAggregation_VALUES_TO_NAMES.at(request.aggregation)
              << ", max results: " << request.maxResults
              << ", restrictors: " << (request.restrictors.size())
              << ", output format: " << _StatsOutputFormat_VALUES_TO_NAMES.at(request.outputFormat)
              << ", min ago: " << request.minAgo
              << ", start ts: " << request.startTsSec
              << ", end ts: " << request.endTsSec
              << ", data source interval: " << request.dsIntervalSec;

  } catch (const std::exception&) {
    LOG(ERROR) << "Error deserializing QueryRequest";
    LOG(ERROR) << "Request: " << body;
    ResponseBuilder(downstream_)
        .status(500, "OK")
        .header("Content-Type", "application/json")
        .body("Failed de-serializing QueryRequest")
        .sendWithEOM();
    return;
  }
  // match to a type-ahead cache
  BeringeiReader dataFetcher(typeaheadCache_, request);
  auto output = dataFetcher.process();
  std::string jsonOutput = "{}";
  try {
    jsonOutput = folly::toJson(output);
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to write results as JSON: " << ex.what();
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("Content-Type", "application/json")
      .body(jsonOutput)
      .sendWithEOM();
}

void StatsHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void StatsHandler::requestComplete() noexcept {
  delete this;
}

void StatsHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
