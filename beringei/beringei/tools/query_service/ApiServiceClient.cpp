/**
 * Copyright (c) 2004-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "ApiServiceClient.h"

namespace facebook {
namespace gorilla {

ApiServiceClient::ApiServiceClient() {}

std::string
ApiServiceClient::formatAddress(const std::string& address) {
  try {
    auto ipAddr = folly::IPAddress(address);
    if (ipAddr.isV6()) {
      return folly::sformat("[{}]", address);
    }
  } catch (const folly::IPAddressFormatException& ex) {}
  return address;
}

} // namespace gorilla
} // namespace facebook
