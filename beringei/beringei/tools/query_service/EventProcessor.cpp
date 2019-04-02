/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "EventProcessor.h"

#include <math.h>
#include <algorithm>
#include <array>
#include <chrono>
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

static std::unordered_map<int, std::string> LinkStateMap = {
    {(int)stats::LinkStateType::LINK_DOWN_OR_NOT_AVAIL,
     "LINK_DOWN_OR_NOT_AVAIL"},
    {(int)stats::LinkStateType::LINK_UP, "LINK_UP"},
    {(int)stats::LinkStateType::LINK_UP_DATADOWN, "LINK_UP_DATADOWN"},
    {(int)stats::LinkStateType::LINK_UP_AVAIL_UNKNOWN, "LINK_UP_AVAIL_UNKNOWN"},
};

std::pair<int* /* intervalStatus */, int /* missingIntervals */>
EventProcessor::computeIntervalStatus(
    const double* timeSeries,
    const int32_t numDataPoints,
    const int32_t timeInterval,
    const double countPerSecond,
    const bool debugLogToConsole) {
  // event processing
  const double expectedStatCounterSlope = countPerSecond * timeInterval;

  int missingIntervals = 0;
  int totalMissingIntervals = 0;

  // caller is responsible for the cleanup
  int* intervalStatus = new int[numDataPoints]{};

  for (int i = 0; i < numDataPoints; i++) {
    std::string slopeValue = "";
    if (std::isnan(timeSeries[i])) {
      // mark missing interval
      missingIntervals++;
      totalMissingIntervals++;
      slopeValue = "MISSING_INTERVAL";
      // special handling of the last 2 data points
      // if missing and previous are up, then assume currently up
      if (i == (numDataPoints - 1) && missingIntervals <= 2 &&
          intervalStatus[i - missingIntervals] == 1) {
        slopeValue =
            "MISSING_FILL_LAST1(" + std::to_string(missingIntervals) + ")";
        std::fill_n(
            intervalStatus + i - missingIntervals + 1, missingIntervals, 1);
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
          slopeValue =
              "UP_FILLED_ALL_MISSING(" + std::to_string(missingIntervals) + ")";
          std::fill_n(
              intervalStatus + i - missingIntervals, missingIntervals + 1, 1);
        } else if (timeSeries[i] > 0) {
          int filledIntervals = (timeSeries[i] / expectedStatCounterSlope);
          std::fill_n(
              intervalStatus + i + 1 - filledIntervals, filledIntervals, 1);
          // some part of the interval was up, not filling partial for now
          // to keep this simple
          slopeValue =
              "UP_FILLED_PARTIAL(" + std::to_string(filledIntervals) + ")";
        } else {
          slopeValue = "DOWN_NO_FILL";
        }
      }
      missingIntervals = 0;
    }
    if (debugLogToConsole) {
      LOG(INFO) << "\tTS(" << i << ") = " << timeSeries[i] << " [" << slopeValue
                << "]"
                << " intervalStatus: " << intervalStatus[i];
    }
  }
  auto output = std::make_pair(intervalStatus, totalMissingIntervals);
  return output;
}

stats::EventList EventProcessor::formatIntervalStatus(
    const int* intervalStatus,
    const time_t startTime,
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
        int64_t eventStartTime = startTime + lastChange * timeInterval;
        int64_t eventEndTime = startTime + i * timeInterval;
        stats::EventDescription eventDescr{};
        eventDescr.startTime = eventStartTime;
        eventDescr.endTime = eventEndTime;
        eventDescr.description = folly::sformat(
            "{} minutes between {} <-> {}",
            (eventEndTime - eventStartTime) / 60.0,
            getTimeStr(eventStartTime),
            getTimeStr(eventEndTime));
        output.events.push_back(eventDescr);
      }
      lastChange = i;
    }
    // special handling for last data point
    if (i == (numDataPoints - 1) && intervalStatus[i] == 1) {
      // last data point is up, record an event
      int64_t eventStartTime = startTime + lastChange * timeInterval;
      int64_t eventEndTime = startTime + i * timeInterval;
      stats::EventDescription eventDescr{};
      eventDescr.startTime = eventStartTime;
      eventDescr.endTime = eventEndTime;
      eventDescr.description = folly::sformat(
          "{} minutes between {} <-> {}",
          (eventEndTime - eventStartTime) / 60.0,
          getTimeStr(eventStartTime),
          getTimeStr(eventEndTime));
      output.events.push_back(eventDescr);
    }
    if (debugLogToConsole) {
      LOG(INFO) << "[" << i << "]: "
                << ((intervalStatus[i] == 1)
                        ? "UP"
                        : (intervalStatus[i] == 0 ? "DOWN" : "____ERROR____"));
    }
  }
  // calculate the amount of intervals online
  int onlineIntervals =
      std::accumulate(&intervalStatus[0], &intervalStatus[numDataPoints], 0);
  double alivePerc = onlineIntervals / (double)numDataPoints * 100.0;
  output.linkAlive = alivePerc;
  if (debugLogToConsole) {
    LOG(INFO) << "Total uptime: " << onlineIntervals << "/" << numDataPoints;
  }
  return output;
}

// this version includes availableStatus
// TODO use thrift instead of folly::dynamic
folly::dynamic EventProcessor::formatIntervalStatus(
    const int* intervalStatus,
    const time_t startTime,
    const int32_t numDataPoints,
    const int32_t timeInterval,
    const int* availableStatus,
    const bool debugLogToConsole) {
  folly::dynamic output = folly::dynamic::object();
  folly::dynamic eventsArray = folly::dynamic::array();
  int lastChange = 0;
  for (int i = 0; i < numDataPoints; i++) {
    // log event when link goes down or available status changes
    if (i > 0 &&
        ((intervalStatus[i] != intervalStatus[i - 1]) ||
         (availableStatus[i] != availableStatus[i - 1] &&
          intervalStatus[i] == 1))) {
      // status changed
      if (intervalStatus[i - 1] == 1) {
        // new status is down, add event for the previous uptime
        // start = lastChange, end = i
        int64_t eventStartTime = startTime + lastChange * timeInterval;
        int64_t eventEndTime = startTime + i * timeInterval;
        int linkState = availableStatus[i - 1];
        folly::dynamic eventDescr = folly::dynamic::object();
        eventDescr["startTime"] = eventStartTime;
        eventDescr["endTime"] = eventEndTime;
        eventDescr["linkState"] = linkState;
        eventDescr["description"] = folly::sformat(
            "{} minutes between {} <-> {}",
            (eventEndTime - eventStartTime) / 60.0,
            getTimeStr(eventStartTime),
            getTimeStr(eventEndTime));
        eventsArray.push_back(eventDescr);
        if (debugLogToConsole) {
          LOG(INFO) << "Event logged [" << i << "]: " << LinkStateMap[linkState]
                    << " lastChange: " << lastChange
                    << " eventStartTime: " << eventStartTime
                    << " eventEndTime: " << eventEndTime
                    << " startTime: " << startTime;
        }
      }
      lastChange = i;
    }
    // special handling for last data point
    if (i == (numDataPoints - 1) && intervalStatus[i] == 1) {
      // last data point is up, record an event
      int64_t eventStartTime = startTime + lastChange * timeInterval;
      int64_t eventEndTime = startTime + i * timeInterval;
      int linkState = availableStatus[i];
      folly::dynamic eventDescr = folly::dynamic::object();
      eventDescr["startTime"] = eventStartTime;
      eventDescr["endTime"] = eventEndTime;
      eventDescr["linkState"] = linkState;
      eventDescr["description"] = folly::sformat(
          "{} minutes between {} <-> {}",
          (eventEndTime - eventStartTime) / 60.0,
          getTimeStr(eventStartTime),
          getTimeStr(eventEndTime));
      eventsArray.push_back(eventDescr);
      if (debugLogToConsole) {
        LOG(INFO) << "Event logged (end) [" << i
                  << "]: " << LinkStateMap[linkState];
      }
    }
  }
  // calculate the amount of intervals online
  int onlineIntervals =
      std::accumulate(&intervalStatus[0], &intervalStatus[numDataPoints], 0);
  double alivePerc = onlineIntervals / (double)numDataPoints * 100.0;
  output["linkAlive"] = alivePerc;
  output["events"] = eventsArray;
  if (debugLogToConsole) {
    LOG(INFO) << "Total uptime: " << onlineIntervals << "/" << numDataPoints;
  }
  return output;
}

// link availability is based on the firmware counters
// mgmtlinkup and linkavailable - if the difference between them changes
// (increases) it means the link is not available
// this function calulates link availability in ms and the events
// for the event graph on the UI
std::unordered_map<std::string /* (un)availability */, double /* ms */>
EventProcessor::findLinkAvailability(
    int* availableStatus,
    const double* linkAvailable,
    const double* mgmtLinkUp,
    const int* intervalStatus,
    const int32_t numDataPoints,
    const int32_t timeInterval,
    const double countPerSecond,
    bool debugLogToConsole) {
  const double countsPerTimeInterval = countPerSecond * timeInterval;
  double* mgmtLinkUpFill = new double[numDataPoints]{};
  double* linkAvailableFill = new double[numDataPoints]{};

  // mgmtLinkUp:
  // replace any missing intervals in mgmtLinkUp with values
  // assuming that
  // mgmtLinkUp will increment every BWGD as long as the link is up
  if (std::isnan(mgmtLinkUp[numDataPoints - 1])) {
    mgmtLinkUpFill[numDataPoints - 1] = 0;
  } else {
    mgmtLinkUpFill[numDataPoints - 1] = mgmtLinkUp[numDataPoints - 1];
  }
  if (debugLogToConsole) {
    LOG(INFO) << numDataPoints - 1 << std::setprecision(10)
              << ": mgmtLinkUp: " << round(mgmtLinkUp[numDataPoints - 1])
              << " ..Fill: " << round(mgmtLinkUpFill[numDataPoints - 1])
              << " intervalStatus: " << intervalStatus[numDataPoints - 1];
  }
  for (int i = numDataPoints - 2; i >= 0; i--) {
    if (std::isnan(mgmtLinkUp[i])) {
      mgmtLinkUpFill[i] =
          std::max(mgmtLinkUpFill[i + 1] - countsPerTimeInterval, 0.0);
    } else {
      mgmtLinkUpFill[i] = mgmtLinkUp[i];
    }
    if (debugLogToConsole) {
      LOG(INFO) << i << ": mgmtLinkUp: " << std::setprecision(10)
                << round(mgmtLinkUp[i])
                << " ..Fill: " << round(mgmtLinkUpFill[i])
                << " i-s: " << intervalStatus[i];
    }
  }

  // Special handling mgmtLinkup:
  // for last two samples - if the link was up before that
  // then assume link is still up
  if (numDataPoints >= 3 && mgmtLinkUp[numDataPoints - 3] > 0 &&
      (std::isnan(mgmtLinkUp[numDataPoints - 1]) ||
       std::isnan(mgmtLinkUp[numDataPoints - 2]))) {
    mgmtLinkUpFill[numDataPoints - 2] =
        mgmtLinkUp[numDataPoints - 3] + countsPerTimeInterval;
    mgmtLinkUpFill[numDataPoints - 1] =
        mgmtLinkUpFill[numDataPoints - 2] + countsPerTimeInterval;
    if (debugLogToConsole) {
      LOG(INFO) << numDataPoints - 2
                << ": Special mgmtLinkUp: " << mgmtLinkUp[numDataPoints - 2]
                << " ..Fill: " << mgmtLinkUpFill[numDataPoints - 2];
    }
    if (debugLogToConsole) {
      LOG(INFO) << numDataPoints - 1
                << ": Special mgmtLinkUp: " << mgmtLinkUp[numDataPoints - 1]
                << " ..Fill: " << mgmtLinkUpFill[numDataPoints - 1];
    }
  }

  // enforce mgmtLinkUp monotonically increasing while the link is up
  // we need this because when we fill linkAvailable, we check for
  // linkAvailable[i] > linkAvailable[i+1] later and don't want to generate a
  // false event
  // non-monotonic mgmtLinkUp is caused by non-uniform writes to
  // Beringei DB
  for (int i = 1; i < numDataPoints; i++) {
    if (mgmtLinkUpFill[i] < mgmtLinkUpFill[i - 1] && intervalStatus[i] &&
        std::isnan(mgmtLinkUp[i])) {
      if (debugLogToConsole) {
        LOG(INFO) << "Monotonic: mgmtLinkUpFill[" << i
                  << "]: " << std::setprecision(10) << round(mgmtLinkUpFill[i])
                  << " -> " << round(mgmtLinkUpFill[i - 1] + 1);
      }
      mgmtLinkUpFill[i] = mgmtLinkUpFill[i - 1] + 1;
    }
  }

  // Find firstValidIndex:
  // if the link starts in LINK_UP and there are unknown samples at the
  // beginning.
  // this can happen if the database or stats aggregator is down or if
  // the link is in LINK_UP_DATADOWN and only one side of the link is
  // producing stats
  // If there are missing samples at the beginnning and mgmtLinkUp >
  // linkAvailable, we can't determine if the link was UP or DATADOWN
  int firstValidIndex;
  if (intervalStatus[0]) {
    firstValidIndex = -1;
    for (int i = 0; i < numDataPoints; i++) {
      if (firstValidIndex == -1 && std::isfinite(mgmtLinkUp[i]) &&
          std::isfinite(linkAvailable[i])) {
        if (mgmtLinkUp[i] <= linkAvailable[i]) {
          // missing samples but link has been available the whole time
          firstValidIndex = 0;
        } else {
          // missing samples and can't determine whether link has been
          // avialable or not
          firstValidIndex = i;
        }
        break;
      }
    }
  } else {
    firstValidIndex = 0;
  }
  if (debugLogToConsole) {
    LOG(INFO) << "firstValidIndex is " << firstValidIndex;
  }

  // linkAvailable:
  // replace any missing intervals in linkAvailable by assuming that the
  // difference between mgmtLinkUp and linkAvailable stays the same
  // during the missing intervals
  if (std::isnan(linkAvailable[numDataPoints - 1])) {
    linkAvailableFill[numDataPoints - 1] = 0;
  } else {
    linkAvailableFill[numDataPoints - 1] = linkAvailable[numDataPoints - 1];
  }
  if (debugLogToConsole) {
    LOG(INFO) << numDataPoints - 1
              << ": linkAvailable: " << std::setprecision(10)
              << round(linkAvailable[numDataPoints - 1])
              << " ..Fill: " << round(linkAvailableFill[numDataPoints - 1]);
  }
  for (int i = numDataPoints - 2; i >= 0; i--) {
    if (std::isnan(linkAvailable[i])) {
      // prediction of what linkAvailable would have been assuming the link
      // is LINK_UP
      double counterDiff = mgmtLinkUpFill[i + 1] - linkAvailableFill[i + 1];
      linkAvailableFill[i] = std::max(mgmtLinkUpFill[i] - counterDiff, 0.0);

    } else {
      linkAvailableFill[i] = linkAvailable[i];
    }
    if (debugLogToConsole) {
      LOG(INFO) << i << ": linkAvailable: " << std::setprecision(10)
                << round(linkAvailable[i])
                << " ..Fill: " << round(linkAvailableFill[i]);
    }
  }

  // adjust filled linkAvailable if it went too low
  // missing linkAvailable samples were filled assuming that the difference
  // between mgmtLinkUp and linkAvailable stays constant; but then when
  // we arrive at a valid sample it will be greater than the predicted sample
  // if the link was in LINK_UP_DATADOWN anywhere in between
  //
  // Checking for intervalStatus[i] should be sufficient but there are
  // cases when the Beringei interval > 30s (saw 35s for example) so add
  // extra checks for link being up at time i - 1 and that the value we
  // are changing was a Fill value
  for (int i = 1; i < numDataPoints; i++) {
    if (linkAvailableFill[i] < linkAvailableFill[i - 1] && intervalStatus[i] &&
        intervalStatus[i - 1] && std::isnan(linkAvailable[i])) {
      if (debugLogToConsole) {
        LOG(INFO) << "Monotonic: linkAvailableFill[" << i
                  << "]: " << std::setprecision(10)
                  << round(linkAvailableFill[i]) << " -> "
                  << round(linkAvailableFill[i - 1]);
      }
      linkAvailableFill[i] = linkAvailableFill[i - 1];
    }
  }

  // Special handling for last two samples of linkAvailableFill
  // if link is available before this, assume it sill available
  if (numDataPoints >= 4 &&
      linkAvailableFill[numDataPoints - 3] >
          linkAvailableFill[numDataPoints - 4] &&
      (std::isnan(linkAvailable[numDataPoints - 1]) ||
       std::isnan(linkAvailable[numDataPoints - 2]))) {
    // assume link is available
    double diff = mgmtLinkUpFill[numDataPoints - 3] -
        linkAvailableFill[numDataPoints - 3];
    linkAvailableFill[numDataPoints - 2] =
        mgmtLinkUpFill[numDataPoints - 2] - diff;
    linkAvailableFill[numDataPoints - 1] =
        mgmtLinkUpFill[numDataPoints - 1] - diff;
  }

  // we can calculate availability by looking at the total linkAvailable count
  // or can calculate unavailability by looking at the difference between
  // mgmtLinkUp and linkAvailable;  in theory, linkAvailable should be
  // total time with linkUnavailable subtracted
  // but there are small errors due to time series
  // alignment with the data being reported
  // We'll choose the metric linkUpButUnavailableMs and linkUpAndAvailableMs
  // that is closest to 0
  // so that 100% uptime and 0% downtime are rendered correctly.
  double linkUpButUnavailableMs = 0;
  double linkUpAndAvailableMs = 0;

  // loop to calculate link availability time based on the first and last
  // samples in each uptime interval
  double mgmtLinkUpBeg = mgmtLinkUpFill[0];
  double linkAvailableBeg = linkAvailableFill[0];
  int state = intervalStatus[0];
  for (int i = 1; i < numDataPoints; i++) {
    if (state == 1 && (!intervalStatus[i] || i == numDataPoints - 1)) {
      // link went down or we hit the end
      state = 0;
      int index = (i == numDataPoints - 1) ? i : i - 1;
      linkUpAndAvailableMs += (linkAvailableFill[index] - linkAvailableBeg) *
          1000.0 / countPerSecond;
      linkUpButUnavailableMs +=
          (mgmtLinkUpFill[index] - linkAvailableFill[index] -
           (mgmtLinkUpBeg - linkAvailableBeg)) *
          1000.0 / countPerSecond;
      if (debugLogToConsole) {
        LOG(INFO) << "Incrementing availability counters @ [" << i
                  << "]: linkUpAndAvailableMs += " << std::setprecision(10)
                  << (linkAvailableFill[index] - linkAvailableBeg) * 1000.0 /
                countPerSecond
                  << ";  linkUpButUnavailableMs += "
                  << (mgmtLinkUpFill[index] - linkAvailableFill[index] -
                      (mgmtLinkUpBeg - linkAvailableBeg)) *
                1000.0 / countPerSecond;
      }
    } else if (state == 0 && intervalStatus[i]) {
      state = 1;
      mgmtLinkUpBeg = 0; // when link goes down, counters are reset to 0
      linkAvailableBeg = 0;
    }
  }

  // loop to compensate for non-atomic mgmtLinkUp and linkAvailable writes
  // don't allow mgmtLinkUp - linkAvailable to exceed the value at the end
  // of an uptime interval
  state = intervalStatus[numDataPoints - 1];
  double maxDiff =
      mgmtLinkUpFill[numDataPoints - 1] - linkAvailableFill[numDataPoints - 1];
  if (debugLogToConsole && state == 1) {
    LOG(INFO) << "maxDiff @ " << numDataPoints - 1 << ": " << maxDiff;
  }
  for (int i = numDataPoints - 2; i >= 0; i--) {
    if (state == 0 && intervalStatus[i]) {
      maxDiff = mgmtLinkUpFill[i] - linkAvailableFill[i];
      state = 1;
      if (debugLogToConsole && state == 1) {
        LOG(INFO) << "setting maxDiff @ " << i << ": " << maxDiff;
      }
    } else if (!intervalStatus[i]) {
      state = 0;
    }
    if (mgmtLinkUpFill[i] - linkAvailableFill[i] > maxDiff &&
        intervalStatus[i]) {
      LOG(INFO) << "Warning: [" << i << "] found case where diff: "
                << mgmtLinkUpFill[i] - linkAvailableFill[i]
                << " > maxDiff: " << maxDiff;
      linkAvailableFill[i] = mgmtLinkUpFill[i] - maxDiff;
    }
  }

  // Main loop after all pre-processing to find availableStatus
  // now mgmtLinkUpFill and linkAvailableFill will have no missing samples
  double counterDiff_ = mgmtLinkUpFill[0] - linkAvailableFill[0];
  for (int i = 1; i < numDataPoints; i++) {
    double counterDiff;
    if (intervalStatus[i]) {
      // don't let counterDiff get smaller - can happen rarely because
      // stats agent can write mgmtLinkUp and linkAvailable at different times
      counterDiff =
          std::max(mgmtLinkUpFill[i] - linkAvailableFill[i], counterDiff_);
      if (counterDiff > counterDiff_) {
        availableStatus[i] = (int)stats::LinkStateType::LINK_UP_DATADOWN;
        if (debugLogToConsole) {
          LOG(INFO) << "Setting " << i << " to "
                    << (int)stats::LinkStateType::LINK_UP_DATADOWN
                    << "; cD - cD_: " << counterDiff - counterDiff_;
        }
      } else {
        availableStatus[i] = (int)stats::LinkStateType::LINK_UP;
        if (debugLogToConsole) {
          LOG(INFO) << "Setting " << i << " to "
                    << (int)stats::LinkStateType::LINK_UP;
        }
      }
      counterDiff_ = counterDiff;
    } else {
      counterDiff_ = 0;
    }
  }

  // special handling for first valid sample
  // in this case, we don't know if the link was available or not so assume
  // it follows whatever comes after it
  if (firstValidIndex < numDataPoints - 1) {
    availableStatus[firstValidIndex] = availableStatus[firstValidIndex + 1];
    if (debugLogToConsole) {
      LOG(INFO) << "Special: Setting " << firstValidIndex << " to "
                << availableStatus[firstValidIndex + 1];
    }
  }

  // special handling if link starts in UP state but there are samples
  // missing at the beginning and mgmtLinkUp > linkAvailable; in this
  // case we can't determine link availability
  if (firstValidIndex > 0 &&
      mgmtLinkUpFill[firstValidIndex] > linkAvailableFill[firstValidIndex]) {
    linkUpButUnavailableMs = std::nan("");
    linkUpAndAvailableMs = std::nan("");
    std::fill_n(
        availableStatus,
        firstValidIndex,
        (int)stats::LinkStateType::LINK_UP_AVAIL_UNKNOWN);
    if (debugLogToConsole) {
      LOG(INFO) << "Special: Filling 0:" << firstValidIndex - 1 << " with "
                << (int)stats::LinkStateType::LINK_UP_AVAIL_UNKNOWN;
    }
  }

  delete[] mgmtLinkUpFill;
  delete[] linkAvailableFill;

  if (debugLogToConsole) {
    LOG(INFO) << "linkUpButUnavailableMs: " << linkUpButUnavailableMs
              << " linkUpAndAvailableMs: " << linkUpAndAvailableMs;
  }
  std::unordered_map<std::string, double> resultMap;
  if (std::isfinite(linkUpButUnavailableMs) &&
      std::isfinite(linkUpAndAvailableMs)) {
    resultMap["linkUpButUnavailableMs"] = linkUpButUnavailableMs;
    resultMap["linkUpAndAvailableMs"] = linkUpAndAvailableMs;
  }
  return resultMap;
}

std::string EventProcessor::getTimeStr(time_t timeSec) {
  char timeStr[100];
  std::strftime(timeStr, sizeof(timeStr), "%T", std::localtime(&timeSec));
  return std::string(timeStr);
}

} // namespace gorilla
} // namespace facebook
