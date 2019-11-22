/**
 * Copyright (c) 2004-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <string>

#include <curl/curl.h>
#include <folly/Optional.h>
#include <gflags/gflags.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

#include "CurlUtil.h"

DECLARE_int32(api_service_request_timeout_s);

namespace facebook {
namespace gorilla {

class ApiServiceClient {
 public:
  ApiServiceClient();

  template <class T>
  static folly::Optional<T> fetchApiService(
      const std::string& host,
      int port,
      const std::string& endpoint,
      const std::string& postData) {
    // Get a curl handle
    CURL* curl = curl_easy_init();
    if (!curl) {
      LOG(ERROR) << "Failed to initialize CURL object";
      return folly::none;
    }

    std::string addr = formatAddress(host, port, endpoint);
    VLOG(3) << "POST request to " << addr << " with data " << postData;

    // Set the URL and other curl options
    curl_easy_setopt(curl, CURLOPT_URL, addr.c_str());
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);  // Only for https
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);  // Only for https
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)postData.length());
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, (long)FLAGS_api_service_request_timeout_s);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curlWriteStringCb);

    std::string s;
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &s);

    // Perform the request and check for errors, res will get the return code
    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
      LOG(ERROR) << "CURL request failed for " << addr << ": "
                 << curl_easy_strerror(res);
      return folly::none;
    }

    if (s.empty()) {
      LOG(ERROR) << "Empty response from " << addr;
      return folly::none;
    }

    try {
      return apache::thrift::SimpleJSONSerializer::deserialize<T>(s);
    } catch (const apache::thrift::protocol::TProtocolException& ex) {
      LOG(ERROR) << "Unable to decode JSON: " << s;
      return folly::none;
    } catch (const std::exception& ex) {
      LOG(ERROR) << "Unknown failure fetching topology: " << ex.what()
                 << ", JSON: " << s;
      return folly::none;
    }
  }

 private:
  static std::string
  formatAddress(const std::string& host, int port, const std::string& endpoint);
};

} // namespace gorilla
} // namespace facebook
