/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <ctime>
#include <string>

namespace facebook {
namespace terragraph {
namespace stats {

class StatsUtils {
 public:
  static time_t getTimeInMs();
  static time_t getTimeInSeconds();
  static std::string getDurationString(const time_t durationInSeconds);
  static std::string toLowerCase(const std::string& str);

};

} // namespace stats
} // namespace terragraph
} // namespace facebook
