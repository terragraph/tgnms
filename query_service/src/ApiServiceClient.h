/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>
#include <unordered_map>
#include <utility>

#include <folly/Format.h>
#include <folly/IPAddress.h>
#include <folly/Optional.h>
#include <folly/Synchronized.h>
#include <folly/dynamic.h>
#include <gflags/gflags.h>
#include <glog/logging.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

#include "CurlUtil.h"
#include "StatsUtils.h"

DECLARE_int32(api_service_request_timeout_s);
DECLARE_bool(keycloak_enabled);

namespace facebook {
namespace terragraph {
namespace stats {

class ApiServiceClient {
 public:
  template <class T>
  static folly::Optional<T> makeRequest(
      const std::string& host,
      int port,
      const std::string& endpoint,
      const std::string& postData = "{}") {
    std::unordered_map<std::string, std::string> headersMap;

    if (FLAGS_keycloak_enabled) {
      auto lockedJwt = jwt_.wlock();
      time_t currTime = StatsUtils::getTimeInSeconds();

      if (lockedJwt->empty() ||
          currTime > refreshTime_ + lockedJwt->at("expires_in").getInt()) {
        VLOG(5) << "Current JWT is expired, refreshing...";
        auto freshJwt = refreshToken();
        if (!freshJwt) {
          LOG(ERROR) << "Failed to fetch a new JWT from Keycloak";
          return folly::none;
        }
        std::swap(*lockedJwt, *freshJwt);
        refreshTime_ = currTime;
      }

      std::string jwt = lockedJwt->at("access_token").getString();
      headersMap["Authorization"] = folly::sformat("Bearer {}", jwt);
    }

    std::string addr;
    try {
      auto ip = folly::IPAddress(host);
      if (ip.isV6()) {
        addr = folly::sformat("http://[{}]:{}/{}", host, port, endpoint);
      } else {
        addr = folly::sformat("http://{}:{}/{}", host, port, endpoint);
      }
    } catch (const folly::IPAddressFormatException&) {
      addr = folly::sformat("http://{}:{}/{}", host, port, endpoint);
    }

    VLOG(3) << "POST request to " << addr << " with data: " << postData;
    auto resp = CurlUtil::makeHttpRequest(
        FLAGS_api_service_request_timeout_s, addr, postData, headersMap);
    if (!resp || resp->code != 200) {
      return folly::none;
    }

    try {
      return apache::thrift::SimpleJSONSerializer::deserialize<T>(resp->body);
    } catch (const apache::thrift::protocol::TProtocolException& ex) {
      LOG(ERROR) << "Unable to decode JSON body: " << resp->body;
      return folly::none;
    } catch (const std::exception& ex) {
      LOG(ERROR) << "Unknown failure: " << ex.what()
                 << ", JSON body: " << resp->body;
      return folly::none;
    }
  }

 private:
  // Last time the keycloak token was refreshed
  static time_t refreshTime_;

  // Lock for controlling who can manipulate the JWT
  static folly::Synchronized<folly::dynamic> jwt_;

  // Fetch a new token from Keycloak
  static folly::Optional<folly::dynamic> refreshToken();
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
