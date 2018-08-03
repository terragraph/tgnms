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
#define LINK_NAME "link"
#define TEST_KEY_ID_2 98111
#define DATA_INCR_RATE 25.6
#define EXPECTED_STAT_COUNTER_SLOPE (THIRTY_SEC * 1000) / DATA_INCR_RATE

using namespace ::testing;
using namespace facebook::gorilla;

typedef std::vector<std::pair<Key, std::vector<TimeValuePair>>> TimeSeries;

class BeringeiDataLinkEventsTest : public testing::Test {
 protected:
  void SetUp() override {
    // set up data for fake query request
    std::vector<int64_t> keyIds;
    keyIds.push_back(TEST_KEY_ID);
    keyIds.push_back(TEST_KEY_ID_2);

    std::vector<query::KeyData> linkKeyData;
    query::KeyData key1;
    key1.keyId = TEST_KEY_ID;
    key1.displayName = "link (A)";
    key1.linkName = LINK_NAME;
    key1.linkTitleAppend = "(A)";

    linkKeyData.push_back(key1);

    query::KeyData key2;
    key2.keyId = TEST_KEY_ID_2;
    key2.displayName = "link (Z)";
    key2.linkName = LINK_NAME;
    key2.linkTitleAppend = "(Z)";
    linkKeyData.push_back(key2);

    query1_.key_ids = keyIds;
    query1_.data = linkKeyData;

    linkQueryRequest_.queries.push_back(query1_);

    // initialize data members
    startTime = START_TIME_UNIX;
    testKeyLinkA.key = std::to_string(TEST_KEY_ID);

    testKeyLinkZ.key = std::to_string(TEST_KEY_ID_2);


    std::vector<TimeValuePair> timeSeriesPointsLinkA;
    std::vector<TimeValuePair> timeSeriesPointsLinkZ;
    testBeringeiTimeSeries.push_back(std::make_pair(testKeyLinkA, timeSeriesPointsLinkA));
    testBeringeiTimeSeries.push_back(std::make_pair(testKeyLinkZ, timeSeriesPointsLinkZ));
    timeSeriesSizeLinkA = 0;
  }

  // add a counter value to the time series array for Link A
  void pushTimeSeriesPointLinkA(double counterValue) {
    TimeValuePair t;
    std::vector<TimeValuePair> timeSeriesPoints =
        testBeringeiTimeSeries[0].second;
    t.unixTime = startTime + (THIRTY_SEC * timeSeriesSizeLinkA);
    t.value = counterValue;
    testBeringeiTimeSeries[0].second.push_back(t);
    timeSeriesSizeLinkA++;
  }

  void pushTimeSeriesPointLinkA() {
    // Skip the next time bucket series so that when pushTimeSeriesPoint is
    // called again, then the point will have the time at next time bucket
    timeSeriesSizeLinkA++;
  }

  // add a counter value to the time series array for Link Z
  void pushTimeSeriesPointLinkZ(double counterValue) {
    TimeValuePair t;
    std::vector<TimeValuePair> timeSeriesPoints =
        testBeringeiTimeSeries[1].second;
    t.unixTime = startTime + (THIRTY_SEC * timeSeriesSizeLinkZ);
    t.value = counterValue;
    testBeringeiTimeSeries[1].second.push_back(t);
    timeSeriesSizeLinkZ++;
  }

  void pushTimeSeriesPointLinkZ() {
    // Skip the next time bucket series so that when pushTimeSeriesPoint is
    // called again, then the point will have the time at next time bucket
    timeSeriesSizeLinkZ++;
  }

  void mockTimeSeries(BeringeiData& dataFetcher) {
    dataFetcher.beringeiTimeSeries_ = testBeringeiTimeSeries;
    dataFetcher.startTime_ = startTime;
    dataFetcher.endTime_ = startTime + (THIRTY_SEC * timeSeriesSizeLinkA);
  }

  query::QueryRequest linkQueryRequest_;
  query::Query query1_;
  query::Query query2_;
  TimeSeries testBeringeiTimeSeries;
  int timeSeriesSizeLinkA;
  int timeSeriesSizeLinkZ;

  time_t startTime;
  Key testKeyLinkA;
  Key testKeyLinkZ;
};

TEST_F(BeringeiDataLinkEventsTest, DirectionADownTest) {
  LOG(INFO) << "LINK EVENTS: STARTING LINK EVENTS TEST";
  LOG(INFO) << "-------------------------------------";

  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPointLinkA(0); // State is down
  pushTimeSeriesPointLinkA(EXPECTED_STAT_COUNTER_SLOPE); // State is moving up
  pushTimeSeriesPointLinkA(EXPECTED_STAT_COUNTER_SLOPE * 2); // State is up
  pushTimeSeriesPointLinkA(0); // State is down
  pushTimeSeriesPointLinkA(EXPECTED_STAT_COUNTER_SLOPE); // State is moving up


  // Create a mocked time series to simulate stat availability counter data
  pushTimeSeriesPointLinkZ(0); // State is down
  // Even though these states are missing, the other link direction should report
  // the correct state
  pushTimeSeriesPointLinkZ(); // State is missing
  pushTimeSeriesPointLinkZ(); // State is missing
  pushTimeSeriesPointLinkZ(0); // State is down
  pushTimeSeriesPointLinkZ(EXPECTED_STAT_COUNTER_SLOPE); // State is moving up

  // Create BeringeiData with query request and process query
  BeringeiData dataFetcher(linkQueryRequest_);
  dataFetcher.process();

  // Replace time series with mocked time series
  mockTimeSeries(dataFetcher);

  folly::dynamic results = dataFetcher.eventHandler(25.6, "alive", BeringeiData::MetricType::LINK);

  LOG(INFO) << "OUTPUT:";
  LOG(INFO) << results;

  // Expect 2 separate events, one that starts 30s after start and another
  // that starts 30s * 4 after the start, 60% alive overall
  folly::dynamic keyResults = results["metrics"][LINK_NAME];
  EXPECT_EQ(keyResults["events"].size(), 2);
  EXPECT_EQ(keyResults["alive"], 60);
  folly::dynamic eventOne = keyResults["events"][0];
  folly::dynamic eventTwo = keyResults["events"][1];
  EXPECT_EQ(eventOne["startTime"], startTime + THIRTY_SEC);
  EXPECT_EQ(eventTwo["startTime"], startTime + (THIRTY_SEC * 4));
}
