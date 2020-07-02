/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "CurlUtil.h"

#include <curl/curl.h>
#include <folly/Format.h>
#include <glog/logging.h>

namespace facebook {
namespace terragraph {
namespace stats {

folly::Optional<struct CurlUtil::Response> CurlUtil::makeHttpRequest(
    int timeoutSeconds,
    const std::string& addr,
    const std::string& postData,
    const std::unordered_map<std::string, std::string>& headersMap,
    const std::string& cookie) {
  // Get a curl handle
  CURL* curl = curl_easy_init();
  if (!curl) {
    LOG(ERROR) << "Failed to initialize CURL object";
    return folly::none;
  }

  struct curl_slist* headers = NULL;
  for (const auto& headerIt : headersMap) {
    std::string h = folly::sformat("{}: {}", headerIt.first, headerIt.second);
    headers = curl_slist_append(headers, h.c_str());
  }

  curl_easy_setopt(curl, CURLOPT_URL, addr.c_str());
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);  // Only for https
  curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);  // Only for https
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, (long)timeoutSeconds);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeStringCb);
  curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, writeStringCb);

  if (!postData.empty()) {
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)postData.length());
  }
  if (!cookie.empty()) {
    curl_easy_setopt(curl, CURLOPT_COOKIE, cookie.c_str());
  }

  std::string body;
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
  std::string header;
  curl_easy_setopt(curl, CURLOPT_HEADERDATA, &header);

  // Perform the request, res will get the return code
  struct Response resp;
  CURLcode res = curl_easy_perform(curl);
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &resp.code);
  resp.header = header;
  resp.body = body;

  // Cleanup
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  // Check for errors
  if (res != CURLE_OK) {
    LOG(ERROR) << "CURL request failed for " << addr << ": "
               << curl_easy_strerror(res);
    return folly::none;
  }

  return resp;
}

size_t
CurlUtil::writeStringCb(void* ptr, size_t size, size_t nmemb, std::string* s) {
  size_t newLength = size * nmemb;

  try {
    s->append((char*)ptr, newLength);
  } catch (const std::bad_alloc& e) {
    LOG(ERROR) << "Allocation failed: " << e.what();
    return 0;
  }

  return newLength;
}

folly::Optional<std::string>
CurlUtil::urlDecode(const std::string& encodedUrl) {
  CURL* curl = curl_easy_init();
  if (!curl) {
    LOG(ERROR) << "Failed to initialize CURL object";
    return folly::none;
  }
  int outlen;
  char* out = curl_easy_unescape(curl, encodedUrl.c_str(), 0, &outlen);
  auto ret = std::string(out, outlen);
  curl_free(out);
  curl_easy_cleanup(curl);
  return ret;
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
