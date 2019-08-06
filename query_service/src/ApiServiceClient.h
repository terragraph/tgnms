/**
 * Copyright (c) 2004-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "CurlUtil.h"

#include "if/gen-cpp2/beringei_query_types_custom_protocol.h"

#include <folly/Format.h>
#include <folly/Optional.h>
#include <folly/String.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

using apache::thrift::SimpleJSONSerializer;

namespace facebook {
namespace gorilla {

class ApiServiceClient {
 public:
  ApiServiceClient();

  template <class T>
  static folly::Optional<T> fetchApiService(
      const std::string& ipAddress,
      int port,
      const std::string& endpoint,
      const std::string& postData) {
    T returnStruct;
    try {
      CURL* curl = curl_easy_init();
      if (!curl) {
        throw std::runtime_error("Unable to initialize CURL");
      }

      std::string url = folly::sformat(
          "http://{}:{}/{}",
          ApiServiceClient::formatAddress(ipAddress),
          port,
          endpoint);

      VLOG(1) << "API service fetch to " << url << " with post data "
              << postData << " (TCP/IP address:port is " << ipAddress << ":"
              << port << ")";

      // We can't verify the peer with our current image/lack of certs
      curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
      curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
      curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
      curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postData.length());
      curl_easy_setopt(curl, CURLOPT_VERBOSE, 0);
      curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1);
      curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1);
      curl_easy_setopt(curl, CURLOPT_TIMEOUT, 1L /* 1 second */);

      // Read data from request
      struct HTTPDataStruct dataChunk;
      dataChunk.data = (char*)malloc(1);
      dataChunk.size = 0;
      curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, &curlWriteCb);
      curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&dataChunk);
      CURLcode res = curl_easy_perform(curl);

      // Cleanup
      curl_easy_cleanup(curl);
      returnStruct = SimpleJSONSerializer::deserialize<T>(folly::StringPiece(
          reinterpret_cast<const char*>(dataChunk.data), dataChunk.size));
      free(dataChunk.data);

      if (res != CURLE_OK) {
        LOG(WARNING) << "CURL error for endpoint " << url << ": "
                     << curl_easy_strerror(res);
        return folly::none;
      }
    } catch (const std::exception& e) {
      LOG(ERROR) << "Error reading from API service: "
                 << folly::exceptionStr(e);
      return folly::none;
    }

    return returnStruct;
  }

 private:
  static std::string formatAddress(const std::string& address);
};
} // namespace gorilla
} // namespace facebook
