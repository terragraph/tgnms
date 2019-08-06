/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "WirelessController.h"

#include <folly/Conv.h>
#include <folly/String.h>
#include <folly/dynamic.h>
#include <folly/json.h>

namespace facebook {
namespace gorilla {

folly::dynamic WirelessController::ruckusControllerStats(
    const query::WirelessController& controller) {
  // return
  folly::dynamic apStats = folly::dynamic::object;
  // login and get a new session id
  folly::dynamic loginObj = folly::dynamic::object(
      "username", controller.username)("password", controller.password);
  struct CurlResponse loginResp = WirelessController::ruckusControllerRequest(
      controller, "session", "", folly::toJson(loginObj));
  VLOG(1) << "Header: " << loginResp.header << ", body: " << loginResp.body;
  // find the cookie string
  std::string cookieStr;
  std::vector<folly::StringPiece> pieces;
  folly::split("\n", loginResp.header, pieces);
  for (const auto& piece : pieces) {
    if (piece.startsWith("Set-Cookie: JSESSIONID")) {
      size_t cookieLen = 12;
      cookieStr = piece.subpiece(cookieLen, piece.find(";") - cookieLen).str();
    }
  }
  if (cookieStr.empty()) {
    LOG(ERROR) << "Unable to login to ruckus controller, response code: "
               << loginResp.responseCode;
    return apStats;
  }
  // fetch ap list in batches
  const int apListSize = 100;
  int apListIndex = 0;
  bool hasMore = true;
  while (hasMore) {
    struct CurlResponse apListResp =
        WirelessController::ruckusControllerRequest(
            controller,
            folly::sformat("aps?listSize={}&index={}", apListSize, apListIndex),
            cookieStr,
            "");
    if (apListResp.responseCode != 200) {
      LOG(ERROR) << "Unable to fetch AP list, response code: "
                 << apListResp.responseCode;
      return apStats;
    }
    folly::dynamic apListObj;
    try {
      apListObj = folly::parseJson(apListResp.body);
    } catch (const std::exception& ex) {
      LOG(ERROR) << "Unable to parse JSON: " << apListResp.body;
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
        std::string apName = apItem["name"].asString();
        std::transform(apName.begin(), apName.end(), apName.begin(), ::tolower);
        std::string macAddr = apItem["mac"].asString();
        // fetch details for each ap
        struct CurlResponse apDetailsResp =
            WirelessController::ruckusControllerRequest(
                controller,
                folly::sformat("aps/{}/operational/summary", macAddr),
                cookieStr,
                "");
        try {
          folly::dynamic apDetailsObj = folly::parseJson(apDetailsResp.body);
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
          LOG(ERROR) << "Unable to parse JSON: " << apDetailsResp.body;
        }
      }
      VLOG(2) << "Total client count: " << totalClientCount;
    }
  }
  return apStats;
}

struct CurlResponse WirelessController::ruckusControllerRequest(
    const query::WirelessController& controller,
    const std::string& uri,
    const std::string& sessionCookie,
    const std::string& postData) {
  struct CurlResponse curlResponse;
  // construct login request
  struct curl_slist* headerList = NULL;
  // we need to specify the content type to get a valid response
  headerList = curl_slist_append(headerList, "Content-Type: application/json");
  try {
    CURL* curl;
    CURLcode res;
    curl = curl_easy_init();
    if (!curl) {
      throw std::runtime_error("Unable to initialize CURL");
    }
    // we have to forward the v4 address right now since no local v6
    std::string endpoint(folly::sformat("{}/{}", controller.url, uri));
    // we can't verify the peer with our current image/lack of certs
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0);
    curl_easy_setopt(curl, CURLOPT_URL, endpoint.c_str());
    if (!postData.empty()) {
      curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
      curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postData.length());
    }
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerList);
    if (!sessionCookie.empty()) {
      curl_easy_setopt(curl, CURLOPT_COOKIE, sessionCookie.c_str());
    }
    curl_easy_setopt(curl, CURLOPT_VERBOSE, 0);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1);
    // use a high timeout since the login service can be sluggish
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15000 /* 15 seconds */);

    // read data from request
    struct HTTPDataStruct dataChunk;
    dataChunk.data = (char*)malloc(1);
    dataChunk.size = 0;
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, &curlWriteCb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&dataChunk);
    // read header data
    struct HTTPDataStruct headerChunk;
    headerChunk.data = (char*)malloc(1);
    headerChunk.size = 0;
    curl_easy_setopt(curl, CURLOPT_HEADERDATA, (void*)&headerChunk);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, &curlWriteCb);
    // make curl request
    res = curl_easy_perform(curl);
    if (res == CURLE_OK) {
      curl_easy_getinfo(
          curl, CURLINFO_RESPONSE_CODE, &curlResponse.responseCode);
    }
    // fill the response
    curlResponse.header = headerChunk.data;
    curlResponse.body = dataChunk.data;
    // cleanup
    curl_slist_free_all(headerList);
    curl_easy_cleanup(curl);
    free(dataChunk.data);
    free(headerChunk.data);
    if (res != CURLE_OK) {
      LOG(WARNING) << "CURL error for endpoint " << endpoint << ": "
                   << curl_easy_strerror(res);
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "CURL Error: " << ex.what();
  }
  // return the header and body separately
  return curlResponse;
}

} // namespace gorilla
} // namespace facebook
