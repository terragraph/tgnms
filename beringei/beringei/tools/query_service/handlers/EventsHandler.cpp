/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "EventsHandler.h"
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

EventsHandler::EventsHandler(bool fetchEvents)
    : RequestHandler(),
      fetchEvents_(fetchEvents) {}

void EventsHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void EventsHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void EventsHandler::onEOM() noexcept {
  auto byteRange = body_->coalesce();
  std::string body(byteRange.begin(), byteRange.end());
  if (fetchEvents_) {
    query::EventsQueryRequest request;
    auto mySqlClient = MySqlClient::getInstance();
    std::string responseJson;
    try {
      request = SimpleJSONSerializer::deserialize<query::EventsQueryRequest>(body);
      LOG(INFO) << "Getting events from topology: " << request.topologyName;
    }
    catch (const std::exception &) {
      LOG(INFO) << "Error deserializing EventsQueryRequest";
      ResponseBuilder(downstream_)
          .status(500, "OK")
          .header("Content-Type", "application/json")
          .body("Failed de-serializing EventsQueryRequest")
          .sendWithEOM();
      return;
    }
    try {
      responseJson = folly::toJson(mySqlClient->getEvents(request));
    }
    catch (const std::runtime_error &ex) {
      LOG(ERROR) << "Failed executing beringei query: " << ex.what();
    }
    ResponseBuilder(downstream_)
        .status(200, "OK")
        .header("Content-Type", "application/json")
        .body(responseJson)
        .sendWithEOM();
  } else {
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
    LOG(INFO) << "Events write request from \"" << request.topology.name
              << "\" with " << request.agents.size() << " nodes";
    // TODO - batch add events
    for (const auto& nodeEvents : request.agents) {
      mySqlClient->addEvents(nodeEvents, request.topology.name);
    }
    ResponseBuilder(downstream_)
        .status(200, "OK")
        .header("Content-Type", "application/json")
        .body("Success")
        .sendWithEOM();
  }
}

void EventsHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void EventsHandler::requestComplete() noexcept { delete this; }

void EventsHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
