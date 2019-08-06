/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <unordered_map>

#include <folly/dynamic.h>
#include "if/gen-cpp2/Stats_types_custom_protocol.h"
#include "if/gen-cpp2/Topology_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class EventProcessor {
 public:
  explicit EventProcessor();

  static std::pair<int* /* intervalStatus */, int /* missingIntervals */>
  computeIntervalStatus(
      const double* timeSeries,
      const int32_t numDataPoints,
      const int32_t timeInterval,
      const double countPerSecond,
      const bool debugLogToConsole = false);

  static stats::EventList formatIntervalStatus(
      const int* intervalStatus,
      const time_t startTime,
      const int32_t numDataPoints,
      const int32_t timeInterval,
      const bool debugLogToConsole = false);

  static folly::dynamic formatIntervalStatus(
      const int* intervalStatus,
      const time_t startTime,
      const int32_t numDataPoints,
      const int32_t timeInterval,
      const int* availableStatus,
      const bool debugLogToConsole = 0);

  static std::unordered_map<std::string, double> findLinkAvailability(
      int* availableStatus,
      const double* linkAvailable,
      const double* mgmtLinkUp,
      const int* intervalStatus,
      const int32_t numDataPoints,
      const int32_t timeInterval,
      const double countPerSecond,
      const bool debugLogToConsole = false);

 private:
  static std::string getTimeStr(time_t timeSec);
};

} // namespace gorilla
} // namespace facebook
