/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "EventsWriteHandler.h"
#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/prepared_statement.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>
#include <folly/DynamicConverter.h>
#include <folly/Conv.h>
#include <folly/io/IOBuf.h>
#include <proxygen/httpserver/ResponseBuilder.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

using apache::thrift::SimpleJSONSerializer;
using namespace proxygen;

namespace facebook {
namespace gorilla {

EventsWriteHandler::EventsWriteHandler() : RequestHandler() {}

void EventsWriteHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void EventsWriteHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void EventsWriteHandler::onEOM() noexcept {
  auto byteRange = body_->coalesce();
  std::string body(byteRange.begin(), byteRange.end());
  query::EventsWriteRequest request;
  auto mySqlClient = MySqlClient::getInstance();
  try {
    request = SimpleJSONSerializer::deserialize<query::EventsWriteRequest>(body);
  }
  catch (const std::exception &ex) {
    LOG(INFO) << "Error deserializing events write request: " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "OK")
        .header("Content-Type", "application/json")
        .body("Failed de-serializing events write request")
        .sendWithEOM();
    return;
  }
  LOG(INFO) << "Events write request for \"" << request.topology.name
            << "\" for " << request.agents.size() << " nodes";
  for (const auto& nodeEvents : request.agents) {
    mySqlClient->addEvents(nodeEvents, request.topology.name);
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("Content-Type", "application/json")
      .body("Success")
      .sendWithEOM();
}

void EventsWriteHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void EventsWriteHandler::requestComplete() noexcept { delete this; }

void EventsWriteHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
