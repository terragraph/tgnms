/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "QueryServiceFactory.h"

#include "StatsTypeAheadCache.h"

#include "handlers/LogsWriteHandler.h"
#include "handlers/NotFoundHandler.h"
#include "handlers/QueryHandler.h"
#include "handlers/RawReadHandler.h"
#include "handlers/RuckusControllerStatsHandler.h"
#include "handlers/StatsTypeAheadHandler.h"
#include "handlers/StatsWriteHandler.h"
#include "handlers/TableQueryHandler.h"

using folly::EventBase;
using folly::EventBaseManager;
using folly::SocketAddress;

namespace facebook {
namespace gorilla {

QueryServiceFactory::QueryServiceFactory(
    std::shared_ptr<MySqlClient> mySqlClient,
    TACacheMap& typeaheadCache)
    : RequestHandlerFactory(),
      mySqlClient_(mySqlClient),
      typeaheadCache_(typeaheadCache) {}

void QueryServiceFactory::onServerStart(folly::EventBase* evb) noexcept {}

void QueryServiceFactory::onServerStop() noexcept {}

proxygen::RequestHandler* QueryServiceFactory::onRequest(
    proxygen::RequestHandler* /* unused */,
    proxygen::HTTPMessage* httpMessage) noexcept {
  auto path = httpMessage->getPath();
  LOG(INFO) << "Received a request for path " << path;

  if (path == "/stats_writer") {
    // The false input indicates that the incoming StatsWriteRequest is
    // serialized by SimpleJSON protocol
    return new StatsWriteHandler(mySqlClient_, false);
  } else if (path == "/query") {
    return new QueryHandler();
  } else if (path == "/table_query") {
    return new TableQueryHandler(typeaheadCache_);
  } else if (path == "/logs_writer") {
    return new LogsWriteHandler();
  } else if (path == "/stats_typeahead") {
    // pass a cache client that stores metric names
    // The false input indicates that the incoming TypeAheadRequest is
    // serialized by SimpleJSON protocol
    return new StatsTypeAheadHandler(mySqlClient_, typeaheadCache_, false);
  } else if (path == "/binary_stats_typeahead") {
    // The cache client that stores metric names along keyId of Beringei DB.
    // The true input indicates that the incoming TypeAheadRequest is
    // serialized by Binary protocol
    return new StatsTypeAheadHandler(mySqlClient_, typeaheadCache_, true);
  } else if (path == "/ruckus_ap_stats") {
    return new RuckusControllerStatsHandler();
  } else if (path == "/raw_query") {
    // NMS Raw Read Request, will read only raw data points
    return new RawReadHandler(typeaheadCache_);
  } else if (path == "/binary_stats_writer") {
    // NMS Write Request
    // The true input indicates that the incoming StatsWriteRequest is
    // serialized by Binary protocol
    return new StatsWriteHandler(mySqlClient_, true);
  }

  // return not found for all other uris
  return new NotFoundHandler();
}
} // namespace gorilla
} // namespace facebook
