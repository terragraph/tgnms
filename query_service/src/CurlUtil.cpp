/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "CurlUtil.h"

#include <glog/logging.h>

namespace facebook {
namespace gorilla {

size_t curlWriteStringCb(void* ptr, size_t size, size_t nmemb, std::string* s) {
  size_t newLength = size * nmemb;

  try {
    s->append((char*)ptr, newLength);
  } catch (const std::bad_alloc& e) {
    LOG(ERROR) << "Allocation failed: " << e.what();
    return 0;
  }

  return newLength;
}

} // namespace gorilla
} // namespace facebook
