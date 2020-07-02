/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <folly/Optional.h>
#include <folly/dynamic.h>

#include "CurlUtil.h"

#include "if/gen-cpp2/QueryService_types_custom_protocol.h"

#pragma once

namespace facebook {
namespace terragraph {
namespace stats {

class WirelessController {
 public:
  explicit WirelessController(){};

  // fetch ruckus ap stats
  static folly::dynamic ruckusControllerStats(
      const thrift::WirelessController& controller);

  static folly::Optional<struct CurlUtil::Response> ruckusControllerRequest(
      const std::string& ctrlUrl,
      const std::string& uri,
      const std::string& sessionCookie,
      const std::string& postData);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
