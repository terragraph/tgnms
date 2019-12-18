/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "QueryServiceFactory.h"

#include "handlers/LogsWriteHandler.h"
#include "handlers/NotFoundHandler.h"
#include "handlers/TestConnectionHandler.h"
#include "handlers/WirelessControllerStatsHandler.h"

using folly::EventBase;
using folly::EventBaseManager;
using folly::SocketAddress;

namespace facebook {
namespace gorilla {

QueryServiceFactory::QueryServiceFactory() : RequestHandlerFactory() {}

void QueryServiceFactory::onServerStart(folly::EventBase* evb) noexcept {}

void QueryServiceFactory::onServerStop() noexcept {}

proxygen::RequestHandler* QueryServiceFactory::onRequest(
    proxygen::RequestHandler* /* unused */,
    proxygen::HTTPMessage* httpMessage) noexcept {
  auto path = httpMessage->getPath();
  LOG(INFO) << "Received a request for path " << path;

  if (path == "/") {
    // returns 200 OK for checking that BQS is up
    return new TestConnectionHandler();
  } else if (path == "/logs_writer") {
    return new LogsWriteHandler();
  } else if (path == "/wireless_controller_stats") {
    return new WirelessControllerStatsHandler();
  }

  // return not found for all other uris
  return new NotFoundHandler();
}
} // namespace gorilla
} // namespace facebook
