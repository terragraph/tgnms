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
#include "handlers/QueryHandler.h"
#include "handlers/RuckusControllerStatsHandler.h"
#include "handlers/StatsTypeAheadHandler.h"
#include "handlers/StatsWriteHandler.h"
#include "handlers/TableQueryHandler.h"

using folly::EventBase;
using folly::EventBaseManager;
using folly::SocketAddress;

namespace facebook {
namespace gorilla {

QueryServiceFactory::QueryServiceFactory(TACacheMap& typeaheadCache)
    : RequestHandlerFactory(),
      typeaheadCache_(typeaheadCache) {}

void QueryServiceFactory::onServerStart(folly::EventBase* evb) noexcept {}

void QueryServiceFactory::onServerStop() noexcept {}

proxygen::RequestHandler* QueryServiceFactory::onRequest(
    proxygen::RequestHandler* /* unused */,
    proxygen::HTTPMessage* httpMessage) noexcept {
  auto path = httpMessage->getPath();
  LOG(INFO) << "Received a request for path " << path;

  if (path == "/stats_writer") {
    return new StatsWriteHandler();
  } else if (path == "/query") {
    return new QueryHandler();
  } else if (path == "/table_query") {
    return new TableQueryHandler(typeaheadCache_);
  } else if (path == "/logs_writer") {
    return new LogsWriteHandler();
  } else if (path == "/stats_typeahead") {
    // pass a cache client that stores metric names
    return new StatsTypeAheadHandler(typeaheadCache_);
  } else if (path == "/ruckus_ap_stats") {
    return new RuckusControllerStatsHandler();
  }

  // return not found for all other uris
  return new NotFoundHandler();
}
} // namespace gorilla
} // namespace facebook
