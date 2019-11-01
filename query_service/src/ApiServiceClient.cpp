/**
 * Copyright (c) 2004-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "ApiServiceClient.h"

#include <folly/Format.h>
#include <folly/IPAddress.h>

DEFINE_int32(
    api_service_request_timeout_s,
    5,
    "Maximum time the request is allowed to take");

namespace facebook {
namespace gorilla {

ApiServiceClient::ApiServiceClient() {}

std::string ApiServiceClient::formatAddress(
    const std::string& host,
    int port,
    const std::string& endpoint) {
  try {
    auto ip = folly::IPAddress(host);
    if (ip.isV6()) {
      return folly::sformat("http://[{}]:{}/{}", host, port, endpoint);
    }
  } catch (const folly::IPAddressFormatException&) {
  }

  return folly::sformat("http://{}:{}/{}", host, port, endpoint);
}

} // namespace gorilla
} // namespace facebook
