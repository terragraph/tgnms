/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "mysql_connection.h"
#include "mysql_driver.h"
#include "EventsQueryHandler.h"
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
using namespace proxygen;

namespace facebook {
namespace gorilla {
EventsQueryHandler::EventsQueryHandler()
    : RequestHandler() {}

void
EventsQueryHandler::onRequest(std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void EventsQueryHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void EventsQueryHandler::onEOM() noexcept {
  auto byteRange = body_->coalesce();
  std::string body(byteRange.begin(), byteRange.end());
  std::string responseJson;
  query::EventsQueryRequest request;
  auto mySqlClient = MySqlClient::getInstance();
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
}

void EventsQueryHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void EventsQueryHandler::requestComplete() noexcept { delete this; }

void EventsQueryHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

}
} // facebook::gorilla
