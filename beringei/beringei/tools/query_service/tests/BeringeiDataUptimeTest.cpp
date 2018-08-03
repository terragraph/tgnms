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

#include "../BeringeiData.h"
#define THIRTY_SEC 30
#define START_TIME_UNIX 1530832685
#define TEST_KEY_ID 98110
#define DATA_INCR_RATE 25.6

using namespace ::testing;
using namespace facebook::gorilla;

typedef std::vector<std::pair<Key, std::vector<TimeValuePair>>> TimeSeries;

class BeringeiDataTest : public testing::Test {
 protected:
  void SetUp() override {
    // set up data for fake query request
    std::vector<int64_t> keyIds;
    keyIds.push_back(TEST_KEY_ID);

    std::vector<query::KeyData> keyData;
    query::KeyData key;
    key.keyId = TEST_KEY_ID;
    keyData.push_back(key);

    query1_.key_ids = keyIds;
    query1_.data = keyData;

    queryRequest_.queries.push_back(query1_);

    // initialize data members
    startTime = START_TIME_UNIX;
    testKey.key = std::to_string(TEST_KEY_ID);

    std::vector<TimeValuePair> timeSeriesPoints;
    testBeringeiTimeSeries.push_back(std::make_pair(testKey, timeSeriesPoints));
    timeSeriesSize = 0;
  }

  // add a counter value to the time series array
  void pushTimeSeriesPoint(double counterValue) {
    TimeValuePair t;
    std::vector<TimeValuePair> timeSeriesPoints =
        testBeringeiTimeSeries[0].second;
    t.unixTime = startTime + (THIRTY_SEC * timeSeriesSize);
    t.value = counterValue;
    testBeringeiTimeSeries[0].second.push_back(t);
    timeSeriesSize++;
  }

  void pushTimeSeriesPoint() {
    // Skip the next time bucket series so that when pushTimeSeriesPoint is
    // called again, then the point will have the time at next time bucket
    timeSeriesSize++;
  }

  void displayResultsToLog(
      std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
          results) {
    for (const auto& resultIt : results) {
      LOG(INFO) << "TESTING KEY: " << resultIt.first;
      LOG(INFO) << "UP(1), DOWN(2), MISSING(3), UNKNOWN(4)";
      std::deque<BeringeiData::UptimeState> uptimeStates = resultIt.second;
      for (const auto& state : uptimeStates) {
        LOG(INFO) << "State: " << state;
      }
    }
  }

  query::QueryRequest queryRequest_;
  query::Query query1_;
  TimeSeries testBeringeiTimeSeries;
  int timeSeriesSize;

  time_t startTime;
  Key testKey;
};

TEST_F(BeringeiDataTest, BasicLinkUpTest) {
  LOG(INFO) << "STARTING UPTIME STATE UP BASIC TEST";
  LOG(INFO) << "-------------------------------------";

  // Every thirty seconds, the stat availability counter should increase by this
  // rate if the stat remains up
  double expectedStatCounterSlope = (THIRTY_SEC * 1000) / DATA_INCR_RATE;

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down
  pushTimeSeriesPoint(expectedStatCounterSlope); // Stat is moving up
  pushTimeSeriesPoint(expectedStatCounterSlope * 2); // Stat is up
  pushTimeSeriesPoint(expectedStatCounterSlope * 3); // Stat is up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(queryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series, update start and end time
  dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
  dataFetcher.startTime_ = startTime;
  dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);

  // Display results of test to console
  std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
      results = dataFetcher.uptimeHandler(DATA_INCR_RATE, THIRTY_SEC);
  displayResultsToLog(results);

  // Test results of uptimeHandler function
  std::deque<BeringeiData::UptimeState> uptimeStates =
      results[std::to_string(TEST_KEY_ID)];

  ASSERT_EQ(timeSeriesSize, 4);
  EXPECT_EQ(uptimeStates[0], BeringeiData::UptimeState::DOWN);
  EXPECT_EQ(uptimeStates[1], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[2], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[3], BeringeiData::UptimeState::UP);
}

TEST_F(BeringeiDataTest, LinkUpOffsetTest) {
  LOG(INFO) << "STARTING UPTIME STATE UP OFFSET TEST";
  LOG(INFO) << "-------------------------------------";

  // Every thirty seconds, the stat availability counter should increase by this
  // rate if the stat remains up
  double expectedStatCounterSlope = (THIRTY_SEC * 1000) / DATA_INCR_RATE;

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(expectedStatCounterSlope * 0.2); // Stat is down
  pushTimeSeriesPoint(expectedStatCounterSlope * 1.2); // Stat is up
  pushTimeSeriesPoint(expectedStatCounterSlope * 2.2); // Stat is up
  pushTimeSeriesPoint(expectedStatCounterSlope * 3.2); // Stat is up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(queryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series, update start and end time
  dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
  dataFetcher.startTime_ = startTime;
  dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);

  // Display results of test to console
  std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
      results = dataFetcher.uptimeHandler(DATA_INCR_RATE, THIRTY_SEC);
  displayResultsToLog(results);

  // Test results of uptimeHandler function
  std::deque<BeringeiData::UptimeState> uptimeStates =
      results[std::to_string(TEST_KEY_ID)];

  ASSERT_EQ(timeSeriesSize, 4);
  EXPECT_EQ(uptimeStates[0], BeringeiData::UptimeState::DOWN);
  EXPECT_EQ(uptimeStates[1], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[2], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[3], BeringeiData::UptimeState::UP);
}

TEST_F(BeringeiDataTest, LinkMissingTest) {
  LOG(INFO) << "STARTING UPTIME STATE MISSING TEST";
  LOG(INFO) << "-------------------------------------";

  // Every thirty seconds, the stat availability counter should increase by this
  // rate if the stat remains up
  double expectedStatCounterSlope = (THIRTY_SEC * 1000) / DATA_INCR_RATE;

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down
  pushTimeSeriesPoint(expectedStatCounterSlope); // Stat is moving up
  pushTimeSeriesPoint(); // Stat is missing, should return missing
  pushTimeSeriesPoint(expectedStatCounterSlope * 3); // Stat is up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(queryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series, update start and end time
  dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
  dataFetcher.startTime_ = startTime;
  dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);

  // Display results of test to console
  std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
      results = dataFetcher.uptimeHandler(DATA_INCR_RATE, THIRTY_SEC);
  displayResultsToLog(results);

  // Test results of uptimeHandler function
  std::deque<BeringeiData::UptimeState> uptimeStates =
      results[std::to_string(TEST_KEY_ID)];

  ASSERT_EQ(timeSeriesSize, 4);
  EXPECT_EQ(uptimeStates[0], BeringeiData::UptimeState::DOWN);
  EXPECT_EQ(uptimeStates[1], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[2], BeringeiData::UptimeState::MISSING);
  EXPECT_EQ(uptimeStates[3], BeringeiData::UptimeState::UP);
}

TEST_F(BeringeiDataTest, LinkUnknownTest) {
  LOG(INFO) << "STARTING UPTIME STATE UNKNOWN TEST";
  LOG(INFO) << "-------------------------------------";

  // Every thirty seconds, the stat availability counter should increase by this
  // rate if the stat remains up
  double expectedStatCounterSlope = (THIRTY_SEC * 1000) / DATA_INCR_RATE;

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down
  pushTimeSeriesPoint(); // Stat is missing data, should return unknown
  pushTimeSeriesPoint(expectedStatCounterSlope * 0.5); // Stat is down
  pushTimeSeriesPoint(expectedStatCounterSlope * 1.5); // Stat is up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(queryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series, update start and end time
  dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
  dataFetcher.startTime_ = startTime;
  dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);

  // Display results of test to console
  std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
      results = dataFetcher.uptimeHandler(DATA_INCR_RATE, THIRTY_SEC);
  displayResultsToLog(results);

  // Test results of uptimeHandler function
  std::deque<BeringeiData::UptimeState> uptimeStates =
      results[std::to_string(TEST_KEY_ID)];

  ASSERT_EQ(timeSeriesSize, 4);
  EXPECT_EQ(uptimeStates[0], BeringeiData::UptimeState::DOWN);
  EXPECT_EQ(uptimeStates[1], BeringeiData::UptimeState::UNKNOWN);
  EXPECT_EQ(uptimeStates[2], BeringeiData::UptimeState::DOWN);
  EXPECT_EQ(uptimeStates[3], BeringeiData::UptimeState::UP);
}

TEST_F(BeringeiDataTest, LinkStateMixedTest) {
  LOG(INFO) << "STARTING UPTIME MIXED STATE TEST";
  LOG(INFO) << "-------------------------------------";

  // Every thirty seconds, the stat availability counter should increase by this
  // rate if the stat remains up
  double expectedStatCounterSlope = (THIRTY_SEC * 1000) / DATA_INCR_RATE;

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(); // Stat is unknown
  pushTimeSeriesPoint(); // Stat is missing, since link is inferred to be up
  pushTimeSeriesPoint(expectedStatCounterSlope * 2.02); // Stat is up
  pushTimeSeriesPoint(expectedStatCounterSlope * 0.2); // Stat is down
  pushTimeSeriesPoint(); // Stat is unknown

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(queryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series, update start and end time
  dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
  dataFetcher.startTime_ = startTime;
  dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);

  // Display results of test to console
  std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
      results = dataFetcher.uptimeHandler(DATA_INCR_RATE, THIRTY_SEC);
  displayResultsToLog(results);

  // Test results of uptimeHandler function
  std::deque<BeringeiData::UptimeState> uptimeStates =
      results[std::to_string(TEST_KEY_ID)];

  ASSERT_EQ(timeSeriesSize, 5);
  EXPECT_EQ(uptimeStates[0], BeringeiData::UptimeState::UNKNOWN);
  EXPECT_EQ(uptimeStates[1], BeringeiData::UptimeState::MISSING);
  EXPECT_EQ(uptimeStates[2], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[3], BeringeiData::UptimeState::DOWN);
  EXPECT_EQ(uptimeStates[4], BeringeiData::UptimeState::UNKNOWN);
}

TEST_F(BeringeiDataTest, LinkStateMixedTestTwo) {
  LOG(INFO) << "STARTING UPTIME MIXED STATE TEST TWO";
  LOG(INFO) << "-------------------------------------";

  // Every thirty seconds, the stat availability counter should increase by this
  // rate if the stat remains up
  double expectedStatCounterSlope = (THIRTY_SEC * 1000) / DATA_INCR_RATE;

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(expectedStatCounterSlope * 1); // Stat is up
  pushTimeSeriesPoint(); // Stat is unknown
  pushTimeSeriesPoint(); // Stat is unknown
  pushTimeSeriesPoint(); // Stat is missing, since it can be inferred that it
                         // was up
  pushTimeSeriesPoint(expectedStatCounterSlope * 2.5); // Stat up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(queryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series, update start and end time
  dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
  dataFetcher.startTime_ = startTime;
  dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);

  // Display results of test to console
  std::unordered_map<std::string, std::deque<BeringeiData::UptimeState>>
      results = dataFetcher.uptimeHandler(DATA_INCR_RATE, THIRTY_SEC);
  displayResultsToLog(results);

  // Test results of uptimeHandler function
  std::deque<BeringeiData::UptimeState> uptimeStates =
      results[std::to_string(TEST_KEY_ID)];

  ASSERT_EQ(timeSeriesSize, 5);
  EXPECT_EQ(uptimeStates[0], BeringeiData::UptimeState::UP);
  EXPECT_EQ(uptimeStates[1], BeringeiData::UptimeState::UNKNOWN);
  EXPECT_EQ(uptimeStates[2], BeringeiData::UptimeState::UNKNOWN);
  EXPECT_EQ(uptimeStates[3], BeringeiData::UptimeState::MISSING);
  EXPECT_EQ(uptimeStates[4], BeringeiData::UptimeState::UP);
}
