/**
 * Copyright (c) 2004-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "ApiServiceClient.h"

#include <exception>

#include <folly/json.h>

DEFINE_int32(
    api_service_request_timeout_s,
    5,
    "Maximum time the request is allowed to take");
DEFINE_bool(
    keycloak_enabled,
    false,
    "Whether API service is protected by keycloak");
DEFINE_string(keycloak_realm, "tgnms", "Keycloak realm name");
DEFINE_string(keycloak_host, "http://keycloak:8080", "Keycloak host address");
DEFINE_string(keycloak_client_id, "", "ID of the client application");
DEFINE_string(
    keycloak_client_secret,
    "",
    "Client secret to authenticate to the token endpoint");

namespace facebook {
namespace terragraph {
namespace stats {

time_t ApiServiceClient::refreshTime_ = 0;
folly::Synchronized<folly::dynamic> ApiServiceClient::jwt_;

folly::Optional<folly::dynamic> ApiServiceClient::refreshToken() {
  if (FLAGS_keycloak_client_id.empty() ||
      FLAGS_keycloak_client_secret.empty()) {
    LOG(ERROR) << "Missing keycloak client ID and/or client secret";
    return folly::none;
  }

  std::string addr = folly::sformat(
      "{}/auth/realms/{}/protocol/openid-connect/token",
      FLAGS_keycloak_host,
      FLAGS_keycloak_realm);
  std::string postData = folly::sformat(
      "grant_type=client_credentials&client_id={}&client_secret={}",
      FLAGS_keycloak_client_id,
      FLAGS_keycloak_client_secret);
  std::unordered_map<std::string, std::string> headersMap;
  headersMap["Content-Type"] = "application/x-www-form-urlencoded";

  auto resp = CurlUtil::makeHttpRequest(
      FLAGS_api_service_request_timeout_s, addr, postData, headersMap);
  if (!resp || resp->code != 200) {
    return folly::none;
  }

  try {
    auto parsed = folly::parseJson(resp->body);
    auto tokenIt = parsed.find("access_token");
    if (tokenIt == parsed.items().end()) {
      VLOG(3) << "Keycloak response is missing 'access_token' key";
      return folly::none;
    }

    auto expirationIt = parsed.find("expires_in");
    if (expirationIt == parsed.items().end()) {
      VLOG(3) << "Keycloak response is missing 'expires_in' key";
      return folly::none;
    }

    return parsed;
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Could not parse keycloak response '" << resp->body
               << "': " << ex.what();
    return folly::none;
  }
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
