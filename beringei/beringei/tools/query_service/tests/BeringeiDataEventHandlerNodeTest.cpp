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
#define NODE_KEY_NAME "nodeKey"
#define DATA_INCR_RATE 25.6
#define EXPECTED_STAT_COUNTER_SLOPE (THIRTY_SEC * 1000) / DATA_INCR_RATE

using namespace ::testing;
using namespace facebook::gorilla;

typedef std::vector<std::pair<Key, std::vector<TimeValuePair>>> TimeSeries;

class BeringeiDataNodeEventsTest : public testing::Test {
 protected:
  void SetUp() override {
    // set up data for fake query request
    std::vector<int64_t> keyIds;
    keyIds.push_back(TEST_KEY_ID);

    std::vector<query::KeyData> nodeKeyData;
    query::KeyData key1;
    key1.keyId = TEST_KEY_ID;
    key1.displayName = NODE_KEY_NAME;
    nodeKeyData.push_back(key1);

    query1_.key_ids = keyIds;
    query1_.data = nodeKeyData;

    nodeQueryRequest_.queries.push_back(query1_);

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

  void mockTimeSeries(BeringeiData& dataFetcher) {
    dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
    dataFetcher.startTime_ = startTime;
    dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSize);
  }

  query::QueryRequest nodeQueryRequest_;
  query::Query query1_;
  query::Query query2_;
  TimeSeries testBeringeiTimeSeries;
  int timeSeriesSize;

  time_t startTime;
  Key testKey;
};


TEST_F(BeringeiDataNodeEventsTest, EmptyEventsTest) {
  LOG(INFO) << "EVENTS: STARTING EMPTY EVENTS TEST";
  LOG(INFO) << "-------------------------------------";

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(nodeQueryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series
  mockTimeSeries(dataFetcher);

  folly::dynamic results = dataFetcher.eventHandler(25.6, "alive", BeringeiData::MetricType::NODE);

  LOG(INFO) << "OUTPUT:";
  LOG(INFO) << results;

  // Get events from response
  folly::dynamic events = results["metrics"][NODE_KEY_NAME]["events"];

  // No events expected since state was DOWN the entire time
  EXPECT_EQ(events.size(), 0);
}

TEST_F(BeringeiDataNodeEventsTest, BasicEventsTest) {
  LOG(INFO) << "EVENTS: STARTING BASIC EVENTS TEST";
  LOG(INFO) << "-------------------------------------";

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down

  // Start event 30 seconds after the start time
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE);
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE * 2); // Stat is up
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE * 3); // Stat is up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(nodeQueryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series
  mockTimeSeries(dataFetcher);

  folly::dynamic results = dataFetcher.eventHandler(25.6, "alive", BeringeiData::MetricType::NODE);

  LOG(INFO) << "OUTPUT:";
  LOG(INFO) << results;

  // Expect only one event starting 30 seconds after startTime that is 75% alive
  folly::dynamic keyResults = results["metrics"][NODE_KEY_NAME];
  EXPECT_EQ(keyResults["events"].size(), 1);
  EXPECT_EQ(keyResults["alive"], 75);
  folly::dynamic event = keyResults["events"][0];
  EXPECT_EQ(event["startTime"], startTime + THIRTY_SEC);
}

TEST_F(BeringeiDataNodeEventsTest, TwoEventsTest) {
  LOG(INFO) << "EVENTS: STARTING TWO EVENTS TEST";
  LOG(INFO) << "-------------------------------------";

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down

  // Start event 30 seconds after the start time
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE); // Stat is moving up
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE * 2); // Stat is up
  pushTimeSeriesPoint(0); // Stat is down

  // Start another event 30 * 4 seconds after the start time
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE); // Stat is moving up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(nodeQueryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series
  mockTimeSeries(dataFetcher);

  folly::dynamic results = dataFetcher.eventHandler(25.6, "alive", BeringeiData::MetricType::NODE);

  LOG(INFO) << "OUTPUT:";
  LOG(INFO) << results;

  // Expect 2 separate events, one that starts 30s after start and another
  // that starts 30s * 4 after the start, 60% alive overall
  folly::dynamic keyResults = results["metrics"][NODE_KEY_NAME];
  EXPECT_EQ(keyResults["events"].size(), 2);
  EXPECT_EQ(keyResults["alive"], 60);
  folly::dynamic eventOne = keyResults["events"][0];
  folly::dynamic eventTwo = keyResults["events"][1];
  EXPECT_EQ(eventOne["startTime"], startTime + THIRTY_SEC);
  EXPECT_EQ(eventTwo["startTime"], startTime + (THIRTY_SEC * 4));
}

TEST_F(BeringeiDataNodeEventsTest, MissingStateEventTest) {
  LOG(INFO) << "EVENTS: STARTING MISSING STATE EVENTS TEST";
  LOG(INFO) << "-------------------------------------";

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPoint(0); // Stat is down
  pushTimeSeriesPoint(); // Missing, event should still start here
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE * 2); // Stat is up
  pushTimeSeriesPoint(0); // Stat is down
  pushTimeSeriesPoint(EXPECTED_STAT_COUNTER_SLOPE); // Stat is moving up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(nodeQueryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series
  mockTimeSeries(dataFetcher);

  folly::dynamic results = dataFetcher.eventHandler(25.6, "alive", BeringeiData::MetricType::NODE);

  LOG(INFO) << "OUTPUT:";
  LOG(INFO) << results;

  // Even though a point is missing, expect the results to be the same as the
  // above test "TwoEventsTest" since we can infer that the missing time is the
  // start of the second event
  folly::dynamic keyResults = results["metrics"][NODE_KEY_NAME];
  EXPECT_EQ(keyResults["events"].size(), 2);
  EXPECT_EQ(keyResults["alive"], 60);
  folly::dynamic eventOne = keyResults["events"][0];
  folly::dynamic eventTwo = keyResults["events"][1];
  EXPECT_EQ(eventOne["startTime"], startTime + THIRTY_SEC);
  EXPECT_EQ(eventTwo["startTime"], startTime + (THIRTY_SEC * 4));
}
