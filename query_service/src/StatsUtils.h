/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
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
