/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <gtest/gtest.h>

#define private public

#include "../NetworkHealthUtils.h"
#include "if/gen-cpp2/Stats_types_custom_protocol.h"

using namespace ::testing;

using facebook::terragraph::stats::LinkStatsByTime;
using facebook::terragraph::stats::NetworkHealthUtils;
using facebook::terragraph::thrift::_LinkStateType_VALUES_TO_NAMES;
using facebook::terragraph::thrift::EventDescription;
using facebook::terragraph::thrift::LinkDirection;
using facebook::terragraph::thrift::LinkStateType;

const double INTERVAL_SEC = 30;
// must match NetworkHealthUtils FLAGS_fw_uptime_slope
const double DPS_PER_SEC = 1000 / 25.6;
const double SLOPE_PER_INTERVAL = INTERVAL_SEC * DPS_PER_SEC;

class NetworkHealthDataPointsTest : public testing::Test {
 protected:
  void SetUp() override {
    networkName_ = "test";
    // Random base date - June 1st 2019 00:00:00
    baseTs_ = 1559372400;
  }

  void logLinkEvents(const std::vector<EventDescription>& eventList) {
    for (const auto& linkEvent : eventList) {
      VLOG(1) << "Link event (" << linkEvent.dbId
              << "): " << linkEvent.startTime << " <-> " << linkEvent.endTime
              << " | "
              << _LinkStateType_VALUES_TO_NAMES.at(linkEvent.linkState);
    }
  }

  folly::Optional<EventDescription> lastEvent_;
  std::string networkName_;
  time_t baseTs_;
};

TEST_F(NetworkHealthDataPointsTest, OnlineNoBackfill) {
  // link starts offline
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  // fill in all data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    linkStatsByTime[curTs].linkAvail = curValue;
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(linkEvent.startTime, baseTs_);
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP);
  }
}

TEST_F(NetworkHealthDataPointsTest, OnlineWithBackfill) {
  const int secondsOfBackfill = 60 * 30; // 30 minutes
  double baseValue = DPS_PER_SEC * secondsOfBackfill;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  // fill in all data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    linkStatsByTime[curTs].linkAvail = curValue;
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(linkEvent.startTime, baseTs_ - secondsOfBackfill);
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP);
  }
}

TEST_F(NetworkHealthDataPointsTest, OnlineMissingOneMiddle) {
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  // fill in most data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    // skip writing one data-point in the middle
    if (i == (intervals / 2)) {
      continue;
    }
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    linkStatsByTime[curTs].linkAvail = curValue;
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(linkEvent.startTime, baseTs_);
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP);
  }
}

TEST_F(NetworkHealthDataPointsTest, OnlineMissingAllButStartEnd) {
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  // fill in most data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    // skip all data-points between start and end
    if (i != 0 && i != (intervals - 1)) {
      continue;
    }
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    linkStatsByTime[curTs].linkAvail = curValue;
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(linkEvent.startTime, baseTs_);
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP);
  }
}

TEST_F(NetworkHealthDataPointsTest, OnlineZeroStart) {
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  const int zeroIntervals = 5;
  // fill in most data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    // skip all data-points between start end end
    if (i < zeroIntervals) {
      linkStatsByTime[curTs].fwUptime = 0;
      linkStatsByTime[curTs].linkAvail = 0;
    } else {
      const double curValue =
          baseValue + ((i - zeroIntervals + 1) * SLOPE_PER_INTERVAL);
      linkStatsByTime[curTs].fwUptime = curValue;
      linkStatsByTime[curTs].linkAvail = curValue;
    }
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(
        linkEvent.startTime, baseTs_ + ((zeroIntervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP);
  }
}

TEST_F(NetworkHealthDataPointsTest, LinkAvailDataDownFullWindow) {
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  // fill in most data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    // skip all data-points between start end end
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    linkStatsByTime[curTs].linkAvail = 0;
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(linkEvent.startTime, baseTs_);
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP_DATADOWN);
  }
}

TEST_F(NetworkHealthDataPointsTest, LinkAvailDataDownFullInterval) {
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  const int dataDownIntervals = 5;
  // fill in most data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;

    if (i < dataDownIntervals) {
      linkStatsByTime[curTs].linkAvail = 0;
    } else {
      linkStatsByTime[curTs].linkAvail =
          (i - dataDownIntervals + 1) * SLOPE_PER_INTERVAL;
    }
  }
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 2);
  // verify LINK_UP_DATADOWN
  ASSERT_EQ(linkEvents[0].startTime, baseTs_);
  ASSERT_EQ(
      linkEvents[0].endTime,
      baseTs_ + ((dataDownIntervals - 1) * INTERVAL_SEC));
  ASSERT_EQ(linkEvents[0].linkState, LinkStateType::LINK_UP_DATADOWN);
  // verify LINK_UP
  ASSERT_EQ(
      linkEvents[1].startTime,
      baseTs_ + ((dataDownIntervals - 1) * INTERVAL_SEC));
  ASSERT_EQ(linkEvents[1].endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
  ASSERT_EQ(linkEvents[1].linkState, LinkStateType::LINK_UP);
}

// same as above but removing N seconds for link avail
TEST_F(NetworkHealthDataPointsTest, LinkAvailDataDownPartialInterval) {
  double baseValue = 0;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  const int dataDownIntervals = 5;
  // remove this number of seconds in link avail
  const int dataDownDeltaSeconds = 10;
  // fill in most data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    // skip all data-points between start end end
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    if (i < dataDownIntervals) {
      linkStatsByTime[curTs].linkAvail = 0;
    } else {
      linkStatsByTime[curTs].linkAvail =
          (i - dataDownIntervals + 1) * SLOPE_PER_INTERVAL -
          (dataDownDeltaSeconds * DPS_PER_SEC);
    }
  }
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent_, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents[0].startTime, baseTs_);
  ASSERT_GE(linkEvents.size(), 2);
  ASSERT_LE(linkEvents.size(), 4);
  int secondsLinkUp = 0;
  int secondsLinkUpDataDown = 0;
  // this test depends on what part of the interval we associate with link_up vs
  // link_up_datadown
  for (const auto& linkEvent : linkEvents) {
    if (linkEvent.linkState == LinkStateType::LINK_UP) {
      secondsLinkUp += (linkEvent.endTime - linkEvent.startTime);
    } else {
      secondsLinkUpDataDown += (linkEvent.endTime - linkEvent.startTime);
    }
  }
  ASSERT_EQ(secondsLinkUp, 140);
  ASSERT_EQ(secondsLinkUpDataDown, 130);
}

// with last event set
TEST_F(NetworkHealthDataPointsTest, LastEventOnlineNoBackfill) {
  // link starts online
  EventDescription lastEvent;
  lastEvent.dbId = 1001;
  lastEvent.startTime = baseTs_ - 60;
  lastEvent.endTime = baseTs_ - 30;
  lastEvent.description = "I am an event";
  lastEvent.linkState = LinkStateType::LINK_UP;

  double baseValue = SLOPE_PER_INTERVAL;
  LinkStatsByTime linkStatsByTime;
  const int intervals = 10;
  // fill in all data-points
  for (int i = 0; i < intervals; i++) {
    const time_t curTs = baseTs_ + (i * INTERVAL_SEC);
    const double curValue = baseValue + (i * SLOPE_PER_INTERVAL);
    linkStatsByTime[curTs].fwUptime = curValue;
    linkStatsByTime[curTs].linkAvail = curValue;
  }
  // link should be seen as online during baseTs <-> baseTs * intervals *
  // intervalSec
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent, linkStatsByTime);
  logLinkEvents(linkEvents);

  ASSERT_EQ(linkEvents.size(), 1);
  for (const auto& linkEvent : linkEvents) {
    ASSERT_EQ(linkEvent.startTime, lastEvent.startTime);
    ASSERT_EQ(linkEvent.endTime, baseTs_ + ((intervals - 1) * INTERVAL_SEC));
    ASSERT_EQ(linkEvent.linkState, LinkStateType::LINK_UP);
  }
}

// 'last event' is newer than supplied data-points, so nothing should change
TEST_F(NetworkHealthDataPointsTest, LinkAvailLastEventNewer) {
  // link starts online
  EventDescription lastEvent;
  lastEvent.dbId = 1001;
  lastEvent.startTime = baseTs_;
  lastEvent.endTime = baseTs_ + 1000;
  lastEvent.description = "I am an event";
  lastEvent.linkState = LinkStateType::LINK_UP_DATADOWN;
  LinkStatsByTime linkStatsByTime;
  for (int i = 0; i < 3; i++) {
    linkStatsByTime[baseTs_ - (3 - i) * 1000].fwUptime = 100000;
    linkStatsByTime[baseTs_ - (3 - i) * 1000].linkAvail = 200000;
  }
  std::vector<EventDescription> linkEvents =
      NetworkHealthUtils::processLinkStats(lastEvent, linkStatsByTime);
  logLinkEvents(linkEvents);

  // original event should be the same
  ASSERT_EQ(linkEvents.size(), 1);
  ASSERT_EQ(linkEvents[0].startTime, lastEvent.startTime);
  ASSERT_EQ(linkEvents[0].endTime, lastEvent.endTime);
  ASSERT_EQ(linkEvents[0].linkState, lastEvent.linkState);
}
