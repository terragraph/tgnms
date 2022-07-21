/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "StatsUtils.h"

#include <chrono>

#include <folly/Format.h>

using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::seconds;
using std::chrono::system_clock;

namespace facebook {
namespace terragraph {
namespace stats {

time_t StatsUtils::getTimeInMs() {
  return duration_cast<milliseconds>(system_clock::now().time_since_epoch())
      .count();
}

time_t StatsUtils::getTimeInSeconds() {
  return duration_cast<seconds>(system_clock::now().time_since_epoch())
      .count();
}

std::string StatsUtils::getDurationString(const time_t durationInSeconds) {
  if (durationInSeconds > (60 * 60)) {
    return folly::sformat("{} hrs", (int)(durationInSeconds / 60.0 / 60.0 * 100) / 100.0);
  }
  if (durationInSeconds > 60) {
    return folly::sformat("{} min", (int)(durationInSeconds / 60.0 * 100) / 100.0);
  }
  return folly::sformat("{} sec", durationInSeconds);
}

std::string StatsUtils::toLowerCase(const std::string& str) {
  std::string newStr{str};
  std::transform(newStr.begin(), newStr.end(), newStr.begin(), ::tolower);
  return newStr;
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
