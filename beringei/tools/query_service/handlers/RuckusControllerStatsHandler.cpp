/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "../RuckusController.h"
#include "RuckusControllerStatsHandler.h"

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

void
RuckusControllerStatsHandler::onRequest(std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void RuckusControllerStatsHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

void RuckusControllerStatsHandler::onEOM() noexcept {
  auto body = body_->moveToFbString();
  std::string responseJson;
  folly::dynamic ruckusStats = RuckusController::ruckusControllerStats();
  try {
    responseJson = folly::toJson(ruckusStats);
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

void RuckusControllerStatsHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void RuckusControllerStatsHandler::requestComplete() noexcept { delete this; }

void RuckusControllerStatsHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

}
} // facebook::gorilla
