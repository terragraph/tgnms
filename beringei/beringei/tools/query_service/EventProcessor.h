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

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class EventProcessor {
 public:
  explicit EventProcessor();

  static int* computeIntervalStatus(
      const double* timeSeries,
      const time_t startTime,
      const time_t endTime,
      const int32_t numDataPoints,
      const int32_t timeInterval,
      const int countPerSecond,
      const bool debugLogToConsole = false);

 static stats::EventList formatIntervalStatus(
      int* intervalStatus,
      const time_t startTime,
      const time_t endTime,
      const int32_t numDataPoints,
      const int32_t timeInterval,
      const bool debugLogToConsole = false);

 private:
   static std::string getTimeStr(time_t timeSec);
};

} // namespace gorilla
} // namespace facebook
