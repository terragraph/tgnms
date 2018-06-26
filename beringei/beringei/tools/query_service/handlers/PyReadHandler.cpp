/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PyReadHandler.h"
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

PyReadHandler::PyReadHandler(TACacheMap& typeaheadCache)
    : RequestHandler(), typeaheadCache_(typeaheadCache), receivedBody_(false) {}

void PyReadHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void PyReadHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  receivedBody_ = true;
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void PyReadHandler::onEOM() noexcept {

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
    // Now the python analytics use binary for serialization
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
  LOG(INFO) << "\n--- The request is ---";
  for (const auto& query : request.queries){
    LOG(INFO) << "Query contains: " << request.queries.size() << " queries"
              << " with start_ts: " << query.start_ts
              << " to end_ts: " << query.end_ts
              << " from Beringei DB with interval: " << query.interval;
  }

  RawReadBeringeiData RawDataFetcher(request, typeaheadCache_);
  std::string response_str;
  try {
    RawQueryReturn query_return_list = RawDataFetcher.process();
    response_str = BinarySerializer::serialize<std::string>(query_return_list);
    // responseJson = folly::toJson(RawDataFetcher.process());
  } catch (const std::runtime_error& ex) {
    LOG(ERROR) << "Failed executing beringei query: " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "Internal Server Error")
        .header("PyRead", "PyRead")
        .body("Failed executing beringei query")
        .sendWithEOM();
    return;
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("PyRead", "PyRead")
      .body(response_str)
      .sendWithEOM();
}

void PyReadHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void PyReadHandler::requestComplete() noexcept {
  LOG(INFO) << "The Read request is complete!";
  delete this;
}

void PyReadHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
