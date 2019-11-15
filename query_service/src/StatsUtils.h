/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <chrono>
#include <string>

#include <folly/Format.h>

namespace facebook {
namespace gorilla {

class StatsUtils {
 public:
  static time_t getTimeInMs();
  static time_t getTimeInSeconds();
  static std::string getDurationString(const time_t durationInSeconds);
  static std::string toLowerCase(const std::string& str);

};

} // namespace gorilla
} // namespace facebook
