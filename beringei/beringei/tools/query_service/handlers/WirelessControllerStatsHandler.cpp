/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "WirelessControllerStatsHandler.h"
#include "../WirelessController.h"

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

void WirelessControllerStatsHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void WirelessControllerStatsHandler::onBody(
    std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void WirelessControllerStatsHandler::onEOM() noexcept {
  auto body = body_->moveToFbString();
  query::WirelessControllerStatsRequest req;
  std::string responseJson;
  try {
    req = SimpleJSONSerializer::deserialize<
        query::WirelessControllerStatsRequest>(body);
  } catch (const std::exception&) {
    LOG(ERROR) << "Error deserializing WirelessControllerStatsRequest";
    ResponseBuilder(downstream_)
        .status(500, "Error")
        .body("Failed de-serializing WirelessControllerStatsRequest")
        .sendWithEOM();
    return;
  }
  try {
    auto topologyInstance = TopologyStore::getInstance();
    auto topologyConfig = topologyInstance->getTopology(req.topologyName);
    if (!topologyConfig->__isset.wireless_controller ||
        topologyConfig->wireless_controller.type != "ruckus") {
      ResponseBuilder(downstream_)
          .status(412, "Error")
          .body(
              "No wireless controller defined or unable to support "
              "wireless controller type")
          .sendWithEOM();
      return;
    }
    folly::dynamic ruckusStats = WirelessController::ruckusControllerStats(
        topologyConfig->wireless_controller);
    responseJson = folly::toJson(ruckusStats);
  } catch (const std::invalid_argument& ex) {
    LOG(ERROR) << "Unable to find topology \"" << req.topologyName << "\".";
    ResponseBuilder(downstream_)
        .status(404, "Error")
        .body("Topology not found")
        .sendWithEOM();
    return;
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Failed fetching ruckus data: " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "Error")
        .body("Failed fetching ruckus controller data")
        .sendWithEOM();
    return;
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("Content-Type", "application/json")
      .body(responseJson)
      .sendWithEOM();
}

void WirelessControllerStatsHandler::onUpgrade(
    UpgradeProtocol /* unused */) noexcept {}

void WirelessControllerStatsHandler::requestComplete() noexcept {
  delete this;
}

void WirelessControllerStatsHandler::onError(
    ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

} // namespace gorilla
} // namespace facebook
