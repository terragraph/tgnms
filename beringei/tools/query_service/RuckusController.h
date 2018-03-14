/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <folly/dynamic.h>

#pragma once

namespace facebook {
namespace gorilla {

struct CurlResponse {
  long responseCode;
  std::string header;
  std::string body;
};

class RuckusController {
 public:
  explicit RuckusController() {};

  // fetch ruckus ap stats
  static folly::dynamic ruckusControllerStats();

  static struct CurlResponse ruckusControllerRequest(
      const std::string& uri,
      const std::string& sessionCookie,
      const std::string& postData);
 private:
};
}
} // facebook::gorilla
