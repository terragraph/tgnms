/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "EventProcessor.h"

#include <algorithm>
#include <array>
#include <chrono>
#include <math.h>
#include <utility>

#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

int*
EventProcessor::computeIntervalStatus(
    const double* timeSeries,
    const time_t startTime,
    const time_t endTime,
    const int32_t numDataPoints,
    const int32_t timeInterval,
    const int countPerSecond,
    const bool debugLogToConsole) {
  // event processing
  const double expectedStatCounterSlope =
      countPerSecond * timeInterval;

  int missingIntervals = 0;

  // caller is responsible for the cleanup
  int* intervalStatus = new int[numDataPoints]{};

  for (int i = 0; i < numDataPoints; i++) {
    std::string slopeValue = "";
    if (std::isnan(timeSeries[i])) {
      // mark missing interval
      missingIntervals++;
      slopeValue = "MISSING_INTERVAL";
      // special handling of the last 2 data points
      // if missing and previous are up, then assume currently up
      if (i == (numDataPoints - 1) && missingIntervals <= 2 &&
          intervalStatus[i - missingIntervals] == 1) {
        slopeValue = "MISSING_FILL_LAST1(" +
                     std::to_string(missingIntervals) + ")";
        std::fill_n(intervalStatus + i - missingIntervals + 1,
                    missingIntervals,
                    1);
      }
    } else {
      // no missing data, either UP or DOWN
      if (missingIntervals == 0) {
        if (timeSeries[i] >= expectedStatCounterSlope) {
          // entire interval is online
          intervalStatus[i] = 1;
          slopeValue = "UP_INTERVAL";
        } else {
          slopeValue = "DOWN_INTERVAL";
        }
      } else if (missingIntervals > 0) {
        // missing/NaN data we can assume were up based on the current value
        if (timeSeries[i] >=
              ((missingIntervals + 1) * expectedStatCounterSlope)) {
          slopeValue = "UP_FILLED_ALL_MISSING(" +
                       std::to_string(missingIntervals) + ")";
          std::fill_n(intervalStatus + i - missingIntervals,
                      missingIntervals + 1,
                      1);
        } else if (timeSeries[i] > 0) {
          int filledIntervals = (timeSeries[i] / expectedStatCounterSlope);
          std::fill_n(intervalStatus + i + 1 - filledIntervals,
                      filledIntervals,
                      1);
          // some part of the interval was up, not filling partial for now
          // to keep this simple
          slopeValue = "UP_FILLED_PARTIAL(" +
                       std::to_string(filledIntervals) + ")";
        } else {
          slopeValue = "DOWN_NO_FILL";
        }
      }
      missingIntervals = 0;
    }
    if (debugLogToConsole) {
      LOG(INFO) << "\tTS(" << i << ") = " << timeSeries[i]
                << " [" << slopeValue << "]";
    }
  }
  return intervalStatus;
}

stats::EventList
EventProcessor::formatIntervalStatus(
    int* intervalStatus,
    const time_t startTime,
    const time_t endTime,
    const int32_t numDataPoints,
    const int32_t timeInterval,
    const bool debugLogToConsole) {
  stats::EventList output{};
  int lastChange = 0;
  for (int i = 0; i < numDataPoints; i++) {
    // log event when state changes (UP/DOWN)
    if (i > 0 && intervalStatus[i] != intervalStatus[i - 1]) {
      // status changed
      if (intervalStatus[i] == 0) {
        // new status is down, add event for the previous uptime
        // start = lastChange, end = i
        int64_t startTime = startTime + lastChange * timeInterval;
        int64_t endTime = startTime + (i - 1) * timeInterval;
        stats::EventDescription eventDescr{};
        eventDescr.startTime = startTime;
        eventDescr.endTime = endTime;
        eventDescr.description = folly::sformat("{} minutes between {} <-> {}",
            (endTime - startTime) / 60.0,
            getTimeStr(startTime),
            getTimeStr(endTime));
        output.events.push_back(eventDescr);
      }
      lastChange = i;
    }
    // special handling for last data point
    if (i == (numDataPoints - 1) && intervalStatus[i] == 1) {
      // last data point is up, record an event
      int64_t startTime = startTime + lastChange * timeInterval;
      int64_t endTime = startTime + i * timeInterval;
      stats::EventDescription eventDescr{};
      eventDescr.startTime = startTime;
      eventDescr.endTime = endTime;
      eventDescr.description = folly::sformat("{} minutes between {} <-> {}",
          (endTime - startTime) / 60.0,
          getTimeStr(startTime),
          getTimeStr(endTime));
      output.events.push_back(eventDescr);
    }
    if (debugLogToConsole) {
      LOG(INFO) << "[" << i << "]: " << ((intervalStatus[i] == 1) ? "UP" :
                (intervalStatus[i] == 0 ? "DOWN" : "____ERROR____"));
    }
  }
  // calculate the amount of intervals online
  int onlineIntervals = std::accumulate(&intervalStatus[0],
                                        &intervalStatus[numDataPoints], 0);
  double alivePerc = onlineIntervals / (double)numDataPoints * 100.0;
  output.alive = alivePerc;
  if (debugLogToConsole) {
    LOG(INFO) << "Total uptime: " << onlineIntervals << "/" << numDataPoints;
  }
  return output;
}

std::string
EventProcessor::getTimeStr(time_t timeSec) {
  char timeStr[100];
  std::strftime(timeStr, sizeof(timeStr), "%T", std::localtime(&timeSec));
  return std::string(timeStr);
}

} // namespace gorilla
} // namespace facebook
