/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "WirelessController.h"

#include <unordered_map>

#include <folly/Conv.h>
#include <folly/String.h>
#include <folly/dynamic.h>
#include <folly/json.h>

#include "StatsUtils.h"

namespace facebook {
namespace terragraph {
namespace stats {

folly::dynamic WirelessController::ruckusControllerStats(
    const thrift::WirelessController& controller) {
  // return
  folly::dynamic apStats = folly::dynamic::object;
  // login and get a new session id
  folly::dynamic loginObj = folly::dynamic::object(
      "username", controller.username)("password", controller.password);
  auto loginResp = WirelessController::ruckusControllerRequest(
      controller.url, "session", "", folly::toJson(loginObj));

  if (!loginResp) {
    LOG(ERROR) << "Login request to ruckus controller failed: "
               << controller.url;
    return apStats;
  }

  VLOG(1) << "Header: " << loginResp->header << ", body: " << loginResp->body;
  // find the cookie string
  std::string cookieStr;
  std::vector<folly::StringPiece> pieces;
  folly::split("\n", loginResp->header, pieces);
  for (const auto& piece : pieces) {
    if (piece.startsWith("Set-Cookie: JSESSIONID")) {
      size_t cookieLen = 12;
      cookieStr = piece.subpiece(cookieLen, piece.find(";") - cookieLen).str();
    }
  }
  if (cookieStr.empty()) {
    LOG(ERROR) << "Unable to login to ruckus controller, response code: "
               << loginResp->code;
    return apStats;
  }
  // fetch ap list in batches
  const int apListSize = 100;
  int apListIndex = 0;
  bool hasMore = true;
  while (hasMore) {
    auto apListResp = WirelessController::ruckusControllerRequest(
        controller.url,
        folly::sformat("aps?listSize={}&index={}", apListSize, apListIndex),
        cookieStr,
        "");
    if (!apListResp || apListResp->code != 200) {
      LOG(ERROR) << "Unable to fetch AP list, response code: "
                 << apListResp->code;
      return apStats;
    }
    folly::dynamic apListObj;
    try {
      apListObj = folly::parseJson(apListResp->body);
    } catch (const std::exception& ex) {
      LOG(ERROR) << "Unable to parse JSON: " << apListResp->body;
      return apStats;
    }
    // ensure all entries are found
    auto apListHasMoreIt = apListObj.find("hasMore");
    hasMore = apListHasMoreIt != apListObj.items().end() &&
        apListHasMoreIt->second.asBool();
    apListIndex += apListSize;
    auto apListObjIt = apListObj.find("list");
    if (apListObjIt != apListObj.items().end()) {
      long totalClientCount = 0L;
      for (const auto& apItem : apListObjIt->second) {
        std::string apName = StatsUtils::toLowerCase(apItem["name"].asString());
        std::string macAddr = StatsUtils::toLowerCase(apItem["mac"].asString());
        // fetch details for each ap
        auto apDetailsResp = WirelessController::ruckusControllerRequest(
            controller.url,
            folly::sformat("aps/{}/operational/summary", macAddr),
            cookieStr,
            "");
        if (!apDetailsResp) {
          LOG(ERROR) << "Failed to fetch operational summary for " << macAddr;
          continue;
        }

        try {
          folly::dynamic apDetailsObj = folly::parseJson(apDetailsResp->body);
          long apUptime = apDetailsObj["uptime"].asInt();
          long clientCount = apDetailsObj["clientCount"].asInt();
          totalClientCount += clientCount;
          std::string registrationState(
              apDetailsObj["registrationState"].asString());
          std::string administrativeState(
              apDetailsObj["administrativeState"].asString());
          std::string ipAddr(apDetailsObj["externalIp"].asString());
          VLOG(2) << "AP: " << apName << ", MAC: " << macAddr
                  << ", uptime: " << apUptime
                  << ", reg state: " << registrationState
                  << ", client count: " << clientCount
                  << ", admin state: " << administrativeState
                  << ", ip: " << ipAddr;
          apStats[apName] = apDetailsObj;
        } catch (const folly::TypeError& error) {
          LOG(ERROR) << "\tType-error: " << error.what();
        } catch (const std::exception& error) {
          LOG(ERROR) << "Unable to parse JSON: " << apDetailsResp->body;
        }
      }
      VLOG(2) << "Total client count: " << totalClientCount;
    }
  }
  return apStats;
}

folly::Optional<struct CurlUtil::Response>
WirelessController::ruckusControllerRequest(
    const std::string& ctrlUrl,
    const std::string& uri,
    const std::string& sessionCookie,
    const std::string& postData) {
  std::string addr = folly::sformat("{}/{}", ctrlUrl, uri);

  std::unordered_map<std::string, std::string> headersMap;
  headersMap["Content-Type"] = "application/json";

  return CurlUtil::makeHttpRequest(
      15 /* timeoutSeconds */ , addr, postData, headersMap, sessionCookie);
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
