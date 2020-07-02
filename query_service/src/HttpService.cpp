/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "HttpService.h"

#include "handlers/LinkHealthHandler.h"
#include "handlers/NotFoundHandler.h"
#include "handlers/TestConnectionHandler.h"

#include "if/gen-cpp2/QueryService_types_custom_protocol.h"

#include <thrift/lib/cpp2/protocol/Serializer.h>

namespace facebook {
namespace terragraph {
namespace stats {

using namespace Pistache::Http;
using namespace Pistache::Rest;

HttpService::HttpService(Pistache::Address addr, int threadCount)
    : httpEndpoint_(std::make_shared<Endpoint>(addr)),
      threadCount_(threadCount) {}

void HttpService::initRoutes() {
  auto opts = Endpoint::options().threads(threadCount_);
  httpEndpoint_->init(opts);
  // these both return 200/OK
  Routes::Get(
      router_, "/", Routes::bind(&TestConnectionHandler::handleRequest));
  Routes::Get(
      router_, "/health", Routes::bind(&TestConnectionHandler::handleRequest));
  // link health
  Routes::Get(
      router_,
      "/link_health/:topologyName/:hoursAgo",
      Routes::bind(&LinkHealthHandler::handleRequest));
  // not found/404
  Routes::NotFound(router_, Routes::bind(&NotFoundHandler::handleRequest));
}

void HttpService::run() {
  httpEndpoint_->setHandler(router_.handler());
  httpEndpoint_->serve();
}

void HttpService::sendErrorResponse(
    Pistache::Http::ResponseWriter& response,
    const std::string& errorMsg) {
  apache::thrift::SimpleJSONSerializer serializer{};
  thrift::ErrorResponse errorResp{};
  errorResp.errorList.push_back(errorMsg);
  response.send(
      Pistache::Http::Code::Internal_Server_Error,
      serializer.serialize<std::string>(errorResp));
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
