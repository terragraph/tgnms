/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "NetworkHealthUtils.h"

#include "MySqlClient.h"

#include <algorithm>
#include <cmath>

#include <folly/String.h>

DEFINE_double(fw_uptime_slope,
              (1000 / 25.6),
              "Expected counter rate for fw_uptime");
// we wait for fw_uptime + link_avail to arrive with the same time-stamp, but
// the data is sharded so these can come at different times due to multiple
// worker threads. allow some slack for data arriving late but not enough to
// run out of memory.
DEFINE_int32(
    link_stats_max_dps,
    // keep 4 hours of data-points waiting for fw_uptime + link_avail to align
    (4 /* hours */ * 60 /* to minutes */ *
      (60 / 30 /* data source interval (sec) */)),
    "Maximum data-points to hold waiting for new records");

namespace facebook {
namespace gorilla {

std::vector<stats::EventDescription> NetworkHealthUtils::processLinkStats(
    folly::Optional<stats::EventDescription> lastEvent,
    LinkStatsByTime& linkStats) {
  VLOG(1) << "======== processLinkStats() BEGIN ========";
  std::vector<stats::EventDescription> eventList;
  // use last known event from DB
  if (lastEvent) {
    eventList.push_back(*lastEvent);
  }
  int idx = 0;
  std::vector<time_t> validTimeSeries{};
  // find time series with both fw uptime and link avail metrics (same ts)
  for (const auto& tsStatsPair : linkStats) {
    idx++;
    const time_t ts = tsStatsPair.first;
    const double fwUptime = tsStatsPair.second.fwUptime;
    const double linkAvail = tsStatsPair.second.linkAvail;
    if (fwUptime == -1 || linkAvail == -1) {
      VLOG(3) << "\t[" << idx << "] Missing value for ts: " << ts;
      continue;
    }
    if (lastEvent && lastEvent->endTime >= ts) {
      VLOG(2) << "Dropping data-point older than the last event.";
      continue;
    }
    VLOG(1) << "\t[" << idx << "] TS[" << ts << "] Fw uptime["
            << std::to_string(fwUptime) << "] link avail["
            << std::to_string(linkAvail) << "]";
    validTimeSeries.push_back(ts);
  }
  if (validTimeSeries.size() < 2) {
    VLOG(1) << "Need at least two valid time series for deltas.";
    VLOG(1) << "======== processLinkStats() END ========";
    return eventList;
  }
  // loop over time series (oldest to newest) with fw uptime + link avail data
  for (int i = 1; i < validTimeSeries.size(); i++) {
    const time_t ts = validTimeSeries[i];
    const double fwUptime = linkStats.at(ts).fwUptime;
    const double linkAvail = linkStats.at(ts).linkAvail;
    // use previous data point
    const time_t prevTs = validTimeSeries[i - 1];
    // should have a delta
    const time_t tsDelta = ts - prevTs;
    double fwUptimeDelta = fwUptime - linkStats.at(prevTs).fwUptime;
    double linkAvailDelta = linkAvail - linkStats.at(prevTs).linkAvail;
    if (fwUptimeDelta < 0) {
      VLOG(1) << "[" << i << "] FW Delta < 0: " << fwUptimeDelta
              << ", assuming counter rolled.";
      // counter rolled, only possible to count from 0<->current value for
      // fw uptime
      fwUptimeDelta = fwUptime;
      // TODO - can we make this assumption?
      linkAvailDelta = linkAvail;
    }
    VLOG(1) << "[" << i << "] Valid FW[" << std::to_string(fwUptime)
            << "] LinkAvail[" << std::to_string(linkAvail) << "] TS Delta["
            << std::to_string(tsDelta) << "] FW Delta["
            << std::to_string(fwUptimeDelta) << "] LinkAvail Delta["
            << std::to_string(linkAvailDelta) << "]";
    // fw uptime delta should == link avail delta
    if (fwUptime == 0) {
      continue;
    }
    stats::EventDescription* lastEvent =
        eventList.empty() ? nullptr : &eventList.back();
    if (lastEvent != nullptr) {
      VLOG(1) << "Last link event: " << lastEvent->startTime << " <-> "
              << lastEvent->endTime << " | "
              << stats::_LinkStateType_VALUES_TO_NAMES.at(lastEvent->linkState);
    }
    ASSERT(fwUptime >= 0);
    const time_t startTs = ts - (fwUptime / FLAGS_fw_uptime_slope);
    if (fwUptimeDelta == linkAvailDelta) {
      // single event for link_up
      if (lastEvent != nullptr && startTs <= lastEvent->endTime &&
          lastEvent->linkState == stats::LinkStateType::LINK_UP) {
        // covers last interval
        VLOG(1) << "\t[a] Updated endTime of lastEvent from "
                << lastEvent->endTime << " -> " << ts;
        lastEvent->endTime = ts;
      } else {
        VLOG(1) << "\t[b] Added new LINK_UP event from " << startTs << " <-> "
                << ts;
        // new event, don't update old event
        stats::EventDescription eventLinkUp;
        eventLinkUp.startTime = lastEvent != nullptr
            ? std::max(startTs, lastEvent->endTime)
            : startTs;
        eventLinkUp.endTime = ts;
        eventLinkUp.linkState = stats::LinkStateType::LINK_UP;
        eventList.emplace_back(eventLinkUp);
      }
    } else {
      // partial link_up, partial link_up_datadown
      bool needsNewLinkUpDataDown = true;
      // rounding up in the cases we have <1 second of data down, we could
      // go the other way on this too
      const time_t dataDownTimeSec = std::ceil(
          (fwUptimeDelta - linkAvailDelta) / FLAGS_fw_uptime_slope);
      time_t eventTransitionTime = ts - dataDownTimeSec;
      const time_t lastEventEndTime =
          lastEvent != nullptr ? lastEvent->endTime : 0;
      // last event is link_up_datadown and whole interval was datadown
      if (lastEvent != nullptr && startTs <= lastEvent->endTime &&
          lastEvent->linkState == stats::LinkStateType::LINK_UP) {
        // extend last event if link_up, then add link_up_datadown
        VLOG(1) << "\t[c] Updated endTime of lastEvent from "
                << lastEvent->endTime << " -> " << eventTransitionTime;
        lastEvent->endTime = eventTransitionTime;
      } else if (linkAvailDelta > 0) {
        // add link_up correlating with fwUptime start or end of last event
        // assuming part of the interval was up
        stats::EventDescription eventLinkUp;
        eventLinkUp.startTime = std::max(startTs, lastEventEndTime);
        // ensure window is at least one second, padding if we rounded to 0
        if (eventLinkUp.startTime == eventTransitionTime) {
          LOG(ERROR) << "Start[" << eventLinkUp.startTime
                     << "] dataDownTimeSec[" << dataDownTimeSec << "]";
          eventTransitionTime += 1;
        }
        eventLinkUp.endTime = eventTransitionTime;
        VLOG(1) << "\t[d] Added new LINK_UP event from "
                << eventLinkUp.startTime << " <-> " << eventTransitionTime;
        ASSERT(eventLinkUp.startTime < eventLinkUp.endTime);
        eventLinkUp.linkState = stats::LinkStateType::LINK_UP;
        eventList.emplace_back(eventLinkUp);
      } else if (
          linkAvailDelta == 0 && lastEvent != nullptr &&
          startTs <= lastEvent->endTime &&
          lastEvent->linkState == stats::LinkStateType::LINK_UP_DATADOWN) {
        // we dont need a link_up event, extend last one
        VLOG(1) << "\t[e] Updated endTime of lastEvent from "
                << lastEvent->endTime << " -> " << ts;
        lastEvent->endTime = ts;
        // or add a new event
        needsNewLinkUpDataDown = false;
      }
      if (needsNewLinkUpDataDown) {
        // add link_up_datadown to the end of the interval
        stats::EventDescription eventLinkUpDataDown;
        eventLinkUpDataDown.startTime = eventTransitionTime;
        eventLinkUpDataDown.endTime = ts;
        VLOG(1) << "\t[f] Added new LINK_UP_DATADOWN event from "
                << eventTransitionTime << " <-> " << ts;
        eventLinkUpDataDown.linkState = stats::LinkStateType::LINK_UP_DATADOWN;
        eventList.emplace_back(eventLinkUpDataDown);
      }
    }
  }
  // take latest valid DP, delete everything prior
  time_t latestValidDP = validTimeSeries.back();
  VLOG(2) << "Using latest valid DP: " << latestValidDP;
  auto it = linkStats.begin();
  while (it != linkStats.cend()) {
    if (it->first < latestValidDP) {
      // DP is older than the most recent valid DP
      VLOG(3) << "\tDeleting DP: " << it->first;
      linkStats.erase(it++);
    } else {
      VLOG(3) << "\tNot deleting DP: " << it->first;
      it++;
    }
  }
  // TODO - what happens when we build up a large list of invalid (missing
  // fw_uptime or link_avail) DPs?
  if (linkStats.size() > FLAGS_link_stats_max_dps) {
    VLOG(2) << "Deleting excess DPs. " << linkStats.size() << " > "
            << FLAGS_link_stats_max_dps;
    auto it = linkStats.begin();
    while (linkStats.size() > FLAGS_link_stats_max_dps) {
      linkStats.erase(it++);
    }
  }
  VLOG(1) << "======== processLinkStats() END ========";
  return eventList;
}

void NetworkHealthUtils::updateLinkEventRecords(
    const std::string& topologyName,
    const std::string& linkName,
    const stats::LinkDirection& linkDirection,
    const std::vector<stats::EventDescription>& eventList) {
  // update events
  VLOG(1) << "updateLinkEventRecords(" << topologyName << ", " << linkName
          << ", A, size(" << eventList.size() << "))";
  auto mysqlInstance = MySqlClient::getInstance();
  for (const auto& event : eventList) {
    if (event.dbId != 0) {
      // update event
      VLOG(1) << "Updating existing event. dbId: " << event.dbId;
      mysqlInstance->updateLinkState(event.dbId, event.endTime);
    } else {
      // create new
      VLOG(1) << "Creating new event. startTime: " << event.startTime
              << ", endTime: " << event.endTime;
      mysqlInstance->addLinkState(
          topologyName,
          linkName,
          linkDirection,
          event.linkState,
          event.startTime,
          event.endTime);
    }
  }
}

} // namespace gorilla
} // namespace facebook
