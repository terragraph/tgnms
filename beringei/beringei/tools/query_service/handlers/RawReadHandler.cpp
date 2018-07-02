/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "RawReadHandler.h"
#include "../RawReadBeringeiData.h"

#include <utility>

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

// RawReadHandler will handle raw data read request and
// return queried results from Beringei DB.
// The incoming request is serialized bytes (RawReadQueryRequest)
// in the incoming http msg body.
// The query return is serialized bytes (RawTimeSeriesList) in the
// http msg return body.
RawReadHandler::RawReadHandler(TACacheMap& typeaheadCache)
    : RequestHandler(), typeaheadCache_(typeaheadCache), receivedBody_(false) {}

void RawReadHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void RawReadHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  receivedBody_ = true;
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void RawReadHandler::onEOM() noexcept {
  if (!receivedBody_) {
    LOG(INFO) << "No data received for POST";
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("PyRead", "PyRead")
        .body("Empty request")
        .sendWithEOM();
    return;
  }
  auto body = body_->moveToFbString();
  query::RawReadQueryRequest request;
  try {
    // Use binary for serialization/deserialization.
    // Binary protocol should be support across all languages.
    request = BinarySerializer::deserialize<query::RawReadQueryRequest>(body);
  } catch (const std::exception&) {
    LOG(INFO) << "Error deserializing QueryRequest";
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("PyRead", "PyRead")
        .body("Failed de-serializing QueryRequest")
        .sendWithEOM();
    return;
  }
  for (const auto& query : request.queries) {
    LOG(INFO) << "Query contains: " << request.queries.size() << " queries"
              << " with startTimestamp: " << query.startTimestamp
              << " to endTimestamp: " << query.endTimestamp
              << " from Beringei DB with interval: " << query.interval;
  }

  RawReadBeringeiData RawDataFetcher(typeaheadCache_);
  std::string responseStr;
  try {
    RawQueryReturn queryReturnList = RawDataFetcher.process(request);
    responseStr = BinarySerializer::serialize<std::string>(queryReturnList);
  } catch (const std::runtime_error& ex) {
    LOG(ERROR) << "Failed executing Beringei query: " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("PyRead", "PyRead")
        .body("Failed executing Beringei query")
        .sendWithEOM();
    return;
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("PyRead", "PyRead")
      .body(responseStr)
      .sendWithEOM();
}

void RawReadHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void RawReadHandler::requestComplete() noexcept {
  LOG(INFO) << "The Read request is complete!";
  delete this;
}

void RawReadHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
