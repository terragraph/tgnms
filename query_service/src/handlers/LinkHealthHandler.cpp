/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "LinkHealthHandler.h"

#include "../CurlUtil.h"
#include "../HttpService.h"
#include "../MySqlClient.h"

#include <string>

#include <gflags/gflags.h>
#include <glog/logging.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_int32(
    link_event_max_delay_sec,
    120,
    "Link event maximum delay allowed in seconds");

namespace facebook {
namespace gorilla {

void LinkHealthHandler::handleRequest(
    const Pistache::Rest::Request& request,
    Pistache::Http::ResponseWriter response) {
  // parse input params
  auto topologyStr = request.param(":topologyName").as<std::string>();
  auto topologyName = CurlUtil::urlDecode(topologyStr);
  if (!topologyName) {
    auto errorMsg =
        folly::sformat("Unable to decode topology name \"{}\"", topologyStr);
    LOG(ERROR) << errorMsg;
    HttpService::sendErrorResponse(response, errorMsg);
    return;
  }
  auto hoursAgo = request.param(":hoursAgo").as<int>();

  auto mysqlInstance = MySqlClient::getInstance();
  // fetch link event data from MySql
  auto linkState = mysqlInstance->getLinkEvents(
      *topologyName, hoursAgo, FLAGS_link_event_max_delay_sec);
  if (!linkState) {
    auto errorMsg = folly::sformat(
        "Error fetching link events from DB for \"{}\"", *topologyName);
    LOG(ERROR) << errorMsg;
    HttpService::sendErrorResponse(response, errorMsg);
    return;
  }
  // serialize response to JSON
  apache::thrift::SimpleJSONSerializer serializer{};
  auto resp = serializer.serialize<std::string>(*linkState);
  response.send(Pistache::Http::Code::Ok, resp);
}

} // namespace gorilla
} // namespace facebook
