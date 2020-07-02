/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <stdlib.h>

#include <string>
#include <unordered_map>

#include <folly/Optional.h>

namespace facebook {
namespace terragraph {
namespace stats {

class CurlUtil {
 public:
  struct Response {
    long code;
    std::string header;
    std::string body;
  };

  // Send a curl request to the given addr with the provided parameters
  static folly::Optional<struct Response> makeHttpRequest(
      int timeoutSeconds,
      const std::string& addr,
      const std::string& postData = "",
      const std::unordered_map<std::string, std::string>& headersMap =
          std::unordered_map<std::string, std::string>(),
      const std::string& cookie = "");

  // decode HTTP string (%XX values)
  static folly::Optional<std::string> urlDecode(const std::string& encodedUrl);

 private:
  // Callback function to write the curl output to a std::string
  static size_t
  writeStringCb(void* ptr, size_t size, size_t nmemb, std::string* s);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
