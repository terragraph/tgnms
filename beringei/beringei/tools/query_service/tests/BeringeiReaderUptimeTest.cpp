/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <gtest/gtest.h>

// allows gtests to modify private data for BeringeiData so that tests can
// mock data about the class to test
#define private public

#include "../BeringeiReader.h"
#include "../StatsTypeAheadCache.h"
#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"

using namespace ::testing;
using namespace facebook;
using facebook::gorilla::BeringeiReader;
using facebook::gorilla::TACacheMap;

const double SLOPE_PER_INTERVAL = 30 /* interval in seconds */
                                * 39 /* data points per second */;

class BeringeiReaderUptimeTest : public testing::Test {
 protected:
  void SetUp() override {
    // set up data for fake query request
    queryRequest_.topologyName = "Test Network";
    queryRequest_.aggregation = stats::GraphAggregation::NONE;
    queryRequest_.outputFormat = stats::StatsOutputFormat::EVENT_LINK;
    queryRequest_.maxResults = 0;
    queryRequest_.countPerSecond = 39;
    // Mon Aug 27 13:00:00 PDT 2018
    queryRequest_.startTsSec = 1535400000;
    queryRequest_.__isset.startTsSec = true;
    // Tue Aug 28 13:00:00 PDT 2018
    queryRequest_.endTsSec = 1535486400;
    queryRequest_.__isset.endTsSec = true;
    queryRequest_.debugLogToConsole = false;
    queryRequest_.__isset.debugLogToConsole = true;

    // add link with A and Z side data
    // A-side - keyId = 10
    std::string keyName = "10";
    keyMetaDataA_.keyId = 10;
    keyMetaDataA_.keyName = keyName;
    keyMetaDataA_.shortName = "fw_uptime";
    keyMetaDataA_.srcNodeMac = "00:00:00:11:22:33";
    keyMetaDataA_.srcNodeName = "Node-1";
    keyMetaDataA_.peerNodeMac = "00:00:00:44:55:66";
    keyMetaDataA_.linkName = "link-Node-1-Node-2";
    keyMetaDataA_.linkDirection = stats::LinkDirection::LINK_A;
    keyMetaDataA_.unit = stats::KeyUnit::NONE;

    // Z-side - keyId = 20
    keyName = "20";
    keyMetaDataZ_.keyId = 10;
    keyMetaDataZ_.keyName = keyName;
    keyMetaDataZ_.shortName = "fw_uptime";
    keyMetaDataZ_.srcNodeMac = "00:00:00:44:55:66";
    keyMetaDataZ_.srcNodeName = "Node-2";
    keyMetaDataZ_.peerNodeMac = "00:00:00:11:22:33";
    keyMetaDataZ_.linkName = "link-Node-1-Node-2";
    keyMetaDataZ_.linkDirection = stats::LinkDirection::LINK_Z;
    keyMetaDataZ_.unit = stats::KeyUnit::NONE;
  }

  void process(BeringeiReader& dataFetcher, double* keyDataA, double* keyDataZ) {
    dataFetcher.output_ = folly::dynamic::object;
    // add links we care about
    dataFetcher.keyDataList_.emplace("10", keyMetaDataA_);
    dataFetcher.keyDataList_.emplace("20", keyMetaDataZ_);
    dataFetcher.keyTimeSeries_.emplace("10" /* a-side link */, keyDataA);
    dataFetcher.keyTimeSeries_.emplace("20" /* z-side link */, keyDataZ);
    // run process() functions without looking up key data or fetching from
    // backend
    dataFetcher.graphAggregation();
    dataFetcher.limitResults();
    dataFetcher.limitDataPoints();
    dataFetcher.formatData();
    dataFetcher.cleanUp();
    delete[] keyDataA_;
    delete[] keyDataZ_;
  }


  stats::QueryRequest queryRequest_;
  TACacheMap typeaheadCache_;
  KeyMetaData keyMetaDataA_;
  KeyMetaData keyMetaDataZ_;
  double* keyDataA_;
  double* keyDataZ_;
  int intervalInSeconds_{30};
};

TEST_F(BeringeiReaderUptimeTest, TimeWindowCheckStartEnd) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
}

TEST_F(BeringeiReaderUptimeTest, EventAlwaysUp) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // set each interval to the expected 'fw_uptime' heartbeat value
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
    keyDataZ[i] = 10000 /* just to be different */ +
                  (i + 1) * SLOPE_PER_INTERVAL;
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime is 100%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  // Only one event in output, since test should show 100% uptime
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // Ensure the correct start + end time and title
  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Reset the counter midway through to simulate a link cut.
 */
TEST_F(BeringeiReaderUptimeTest, EventPartialOutage) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  int intervalBreak = 1000;
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // set each interval to the expected 'fw_uptime' heartbeat value
    if (i <= intervalBreak) {
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = 10000 /* just to be different on one side */ +
                    (i + 1) * SLOPE_PER_INTERVAL;
    } else {
      // reset uptime for both sides, first interval after break needs to be 0
      keyDataA[i] = (i - intervalBreak - 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i - intervalBreak - 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), (double)2880 / 2881 * 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 2);

  // Ensure the correct start + end time and title for the first event
  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  // if, for example, link is up for only one timebucket, endTime should be
  // 30 + startTime
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.startTsSec + (intervalInSeconds_ * (intervalBreak + 1)));

  // second event is down one interval after the break
  // expect 2 intervals after to report up
  ASSERT_EQ(keyIt->second["events"][1]["startTime"].asInt(),
            queryRequest_.startTsSec +
                (intervalInSeconds_ * (intervalBreak + 2)));
  ASSERT_EQ(keyIt->second["events"][1]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of empty initial data, with later data that shows it's been up for
 * the entire interval.
 *
 * Set the initial data-points to 'MISSING' (NaN), then fill in what they
 * should've been for the whole interval
 */
TEST_F(BeringeiReaderUptimeTest, EventMissingFillAll) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  int initialMissingIntervals = 100;
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    if (i < initialMissingIntervals) {
      keyDataA[i] = std::nan("");
      keyDataZ[i] = std::nan("");
    } else {
      // reset uptime for both sides
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // Ensure the correct start + end time and title for the first event
  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of empty initial data, with partial fill.
 */
TEST_F(BeringeiReaderUptimeTest, EventMissingFillPartial) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  int initialMissingIntervals = 100;
  int missingIntervals = 50;
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    if (i < initialMissingIntervals) {
      keyDataA[i] = std::nan("");
      keyDataZ[i] = std::nan("");
    } else {
      // reset uptime for both sides
      keyDataA[i] = (i + 1 - missingIntervals) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i + 1 - missingIntervals) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  // 2881 intervals, first 50 (0-49) are missing
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), (double)2831 / 2881 * 100);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // start time should be offset by the # of missing intervals
  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec + (missingIntervals * intervalInSeconds_));
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of empty initial data, with partial fill.
 */
TEST_F(BeringeiReaderUptimeTest, EventMissingMissingGaps) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    if (i % 4) {
      keyDataA[i] = std::nan("");
      keyDataZ[i] = std::nan("");
    } else {
      // reset uptime for both sides
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of missing data on the last point.
 */
TEST_F(BeringeiReaderUptimeTest, EventMissingLastPoint) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    if (i == (dataFetcher.numDataPoints_ - 1)) {
      // mark the last data point as missing
      keyDataA[i] = std::nan("");
      keyDataZ[i] = std::nan("");
    } else {
      // reset uptime for both sides
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of missing data on the last two points.
 */
TEST_F(BeringeiReaderUptimeTest, EventMissingLastTwoPoints) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    if (i >= (dataFetcher.numDataPoints_ - 2)) {
      // mark the last data point as missing
      keyDataA[i] = std::nan("");
      keyDataZ[i] = std::nan("");
    } else {
      // reset uptime for both sides
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of missing data on the last point when previous is down.
 */
TEST_F(BeringeiReaderUptimeTest, EventMissingLastPointPreviousDown) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    if (i == (dataFetcher.numDataPoints_ - 1)) {
      // mark the last data point as missing
      keyDataA[i] = std::nan("");
      keyDataZ[i] = std::nan("");
    } else if (i == (dataFetcher.numDataPoints_ - 2)) {
      // mark the second to last data point as down
      keyDataA[i] = 0;
      keyDataZ[i] = 0;
    } else {
      // reset uptime for both sides
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
      keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), (double)2879 / 2881 * 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // 2 data points down at the end
  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec - 1 * intervalInSeconds_);
}

/**
 * Handling of missing data on one side of the link.
 */
TEST_F(BeringeiReaderUptimeTest, EventLinkFillMissingOnOneSide) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // reset uptime for both sides
    if (i % 4) {
      keyDataA[i] = std::nan("");
    } else {
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
    keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.endTsSec);
}

/**
 * Handling of link data with conflicting state on A/Z resulting in a partial
 * fill.
 */
TEST_F(BeringeiReaderUptimeTest, EventLinkFillDifferingOneSide) {
  // Create BeringeiData with query request and process query
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // a side missing data for 11 intervals
    if (i >= 1000 && i <= 1010) {
      keyDataA[i] = 0;
    } else {
      keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
    // z side missing data for 6 intervals
    if (i >= 1005 && i <= 1010) {
      keyDataZ[i] = 0;
    } else {
      keyDataZ[i] = (i + 1) * SLOPE_PER_INTERVAL;
    }
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);
  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  // expect 6 missing intervals
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), (double)2875 / 2881 * 100.0);
  ASSERT_EQ(keyIt->second["events"].size(), 2);

  // 1005 is the first interval with 0 data on both sides, so end at 1004
  ASSERT_EQ(keyIt->second["events"][0]["startTime"].asInt(),
            queryRequest_.startTsSec);
  ASSERT_EQ(keyIt->second["events"][0]["endTime"].asInt(),
            queryRequest_.startTsSec + (intervalInSeconds_ * 1005));
  // resume online status at 1011
  ASSERT_EQ(keyIt->second["events"][1]["startTime"].asInt(),
            queryRequest_.startTsSec + (intervalInSeconds_ * 1011));
  ASSERT_EQ(keyIt->second["events"][1]["endTime"].asInt(),
            queryRequest_.endTsSec);
}
