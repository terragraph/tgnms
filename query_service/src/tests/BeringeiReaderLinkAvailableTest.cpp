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
#include "if/gen-cpp2/Stats_types_custom_protocol.h"

using namespace ::testing;
using namespace facebook;
using facebook::gorilla::BeringeiReader;
using facebook::gorilla::TACacheMap;

const double SLOPE_PER_INTERVAL = 30 /* interval in seconds */
    * 39 /* data points per second */;

class BeringeiReaderLinkAvailableTest : public testing::Test {
 protected:
  void SetUp() override {
    // set up data for fake query request
    queryRequest_.topologyName = "Test Network";
    queryRequest_.aggregation = stats::GraphAggregation::NONE;
    queryRequest_.outputFormat = stats::StatsOutputFormat::EVENT_LINK;
    queryRequest_.maxResults = 0;
    queryRequest_.countPerSecond = 1000.0 / 25.6;
    // Mon Aug 27 13:00:00 PDT 2018
    queryRequest_.startTsSec = 1535400000;
    queryRequest_.__isset.startTsSec = true;
    // Tue Aug 28 13:00:00 PDT 2018
    queryRequest_.endTsSec = 1535486400;
    queryRequest_.__isset.endTsSec = true;
    queryRequest_.debugLogToConsole = true;
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

    keyName = "11";
    keyMetaDataALa_.keyId = 11;
    keyMetaDataALa_.keyName = keyName;
    keyMetaDataALa_.shortName = "link_avail";
    keyMetaDataALa_.srcNodeMac = "00:00:00:11:22:33";
    keyMetaDataALa_.srcNodeName = "Node-1";
    keyMetaDataALa_.peerNodeMac = "00:00:00:44:55:66";
    keyMetaDataALa_.linkName = "link-Node-1-Node-2";
    keyMetaDataALa_.linkDirection = stats::LinkDirection::LINK_A;
    keyMetaDataALa_.unit = stats::KeyUnit::NONE;

    // Z-side - keyId = 20
    keyName = "20";
    keyMetaDataZ_.keyId = 20;
    keyMetaDataZ_.keyName = keyName;
    keyMetaDataZ_.shortName = "fw_uptime";
    keyMetaDataZ_.srcNodeMac = "00:00:00:44:55:66";
    keyMetaDataZ_.srcNodeName = "Node-2";
    keyMetaDataZ_.peerNodeMac = "00:00:00:11:22:33";
    keyMetaDataZ_.linkName = "link-Node-1-Node-2";
    keyMetaDataZ_.linkDirection = stats::LinkDirection::LINK_Z;
    keyMetaDataZ_.unit = stats::KeyUnit::NONE;

    keyName = "21";
    keyMetaDataZLa_.keyId = 21;
    keyMetaDataZLa_.keyName = keyName;
    keyMetaDataZLa_.shortName = "link_avail";
    keyMetaDataZLa_.srcNodeMac = "00:00:00:44:55:66";
    keyMetaDataZLa_.srcNodeName = "Node-2";
    keyMetaDataZLa_.peerNodeMac = "00:00:00:11:22:33";
    keyMetaDataZLa_.linkName = "link-Node-1-Node-2";
    keyMetaDataZLa_.linkDirection = stats::LinkDirection::LINK_Z;
    keyMetaDataZLa_.unit = stats::KeyUnit::NONE;
  }

  void process(
      BeringeiReader& dataFetcher,
      double* keyDataA,
      double* keyDataZ,
      double* keyDataALa,
      double* keyDataZLa) {
    dataFetcher.output_ = folly::dynamic::object;
    // add links we care about
    dataFetcher.keyDataList_.emplace("10", keyMetaDataA_);
    dataFetcher.keyDataList_.emplace("20", keyMetaDataZ_);
    dataFetcher.keyDataList_.emplace("11", keyMetaDataALa_);
    dataFetcher.keyDataList_.emplace("21", keyMetaDataZLa_);

    dataFetcher.keyTimeSeries_.emplace("10" /* a-side link */, keyDataA);
    dataFetcher.keyTimeSeries_.emplace("20" /* z-side link */, keyDataZ);
    dataFetcher.keyTimeSeries_.emplace("11" /* a-side link */, keyDataALa);
    dataFetcher.keyTimeSeries_.emplace("21" /* z-side link */, keyDataZLa);
    // run process() functions without looking up key data or fetching from
    // backend
    dataFetcher.graphAggregation();
    dataFetcher.limitResults();
    dataFetcher.limitDataPoints();
    dataFetcher.formatData();
    dataFetcher.cleanUp();
  }

  stats::QueryRequest queryRequest_;
  TACacheMap typeaheadCache_;
  KeyMetaData keyMetaDataA_;
  KeyMetaData keyMetaDataZ_;
  KeyMetaData keyMetaDataALa_;
  KeyMetaData keyMetaDataZLa_;
  double* keyDataA_;
  double* keyDataZ_;
  double* keyDataALa_;
  double* keyDataZLa_;
  int intervalInSeconds_{30};
};

TEST_F(BeringeiReaderLinkAvailableTest, EventAlwaysUp) {
  // Link is always up and always available
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  double start = 54321;
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = std::nan("");
    keyDataALa[i] = keyDataA[i] - 1452; // just to be different
    keyDataZLa[i] = std::nan("");
  }

  // last two samples are missing
  keyDataA[dataFetcher.numDataPoints_ - 1] = std::nan("");
  keyDataA[dataFetcher.numDataPoints_ - 2] = std::nan("");
  keyDataALa[dataFetcher.numDataPoints_ - 1] = std::nan("");
  keyDataALa[dataFetcher.numDataPoints_ - 2] = std::nan("");

  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime and Available is 100%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_EQ(keyIt->second["linkAvailForData"].asDouble(), 100.0);
  // Only one event in output, since test should show 100% uptime
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // Ensure the correct start + end time and title
  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(), queryRequest_.endTsSec);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventAlwaysAvailFirstSamplesMissing) {
  // link up and available whole time, some missing data at the beginning
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int missingIntervals = 100;
  for (int i = missingIntervals; i < dataFetcher.numDataPoints_; i++) {
    // set each interval to the expected 'fw_uptime' heartbeat value
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL + 12345;
    keyDataZ[i] =
        10000 /* just to be different */ + (i + 1) * SLOPE_PER_INTERVAL;
    keyDataALa[i] = keyDataA[i];
    keyDataZLa[i] = keyDataZ[i];
  }
  for (int i = 0; i < missingIntervals; i++) {
    // missing data
    keyDataA[i] = std::nan("");
    keyDataZ[i] = std::nan("");
    keyDataALa[i] = std::nan("");
    keyDataZLa[i] = std::nan("");
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime and Available is 100%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_EQ(keyIt->second["linkAvailForData"].asDouble(), 100.0);
  // Only one event in output, since test should show 100% uptime
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // Ensure the correct start + end time and title
  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventUnkAvailabilityAtStart) {
  // first 100 samples are missing but the link is up, then
  // link stays up the rest of the time, availability in the beginning
  // is unknown
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int missingIntervals = 100;
  int start = 34521;
  for (int i = missingIntervals; i < dataFetcher.numDataPoints_; i++) {
    // set each interval to the expected 'fw_uptime' heartbeat value
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] =
        10000 /* just to be different */ + (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataALa[i] = keyDataA[i] - 2456;
    keyDataZLa[i] = keyDataZ[i] - 4324;
  }
  for (int i = 0; i < missingIntervals; i++) {
    // missing data
    keyDataA[i] = std::nan("");
    keyDataALa[i] = std::nan("");
  }
  // algorithm should choose the A side
  for (int i = 0; i < missingIntervals + 5; i++) {
    // missing data
    keyDataZ[i] = std::nan("");
    keyDataZLa[i] = std::nan("");
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime and Available is 100%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  // make sure linkAvailForData is not there meaning that it is unknown
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") == keyIt->second.items().end());
  // Only one event in output, since test should show 100% uptime
  ASSERT_EQ(keyIt->second["events"].size(), 2);

  // Ensure the correct start + end time and title
  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * missingIntervals));
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_AVAIL_UNKNOWN);

  ASSERT_EQ(
      keyIt->second["events"][1]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * missingIntervals));
  ASSERT_EQ(
      keyIt->second["events"][1]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][1]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventNeverAvailable) {
  // link up but not available the whole time
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int start = 34567;
  int missingIntervals = 100;
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // set each interval to the expected 'fw_uptime' heartbeat value
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] =
        100 /* just to be different */ + (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataALa[i] = start - 1000;
    keyDataZLa[i] = start - 2000;
  }
  for (int i = 1; i < missingIntervals; i++) {
    // missing data just to make sure it's handled
    keyDataA[i] = std::nan("");
    keyDataALa[i] = std::nan("");
    keyDataZ[i] = std::nan("");
    keyDataZLa[i] = std::nan("");
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime is 100%, availability is 0%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_EQ(keyIt->second["linkAvailForData"].asDouble(), 0.0);
  // Only one event in output, since test should show 100% uptime
  ASSERT_EQ(keyIt->second["events"].size(), 1);

  // Ensure the correct start + end time and title
  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_DATADOWN);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventUnkThenUnvailThenAvail) {
  // first 100 samples are missing but the link is up, then
  // link stays up the rest of the time, availability in the beginning
  // is unknown, then link is not available then it is
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int missingIntervals = 100;
  int datadownIntervals = 200;
  int start = SLOPE_PER_INTERVAL * missingIntervals + 34521;
  for (int i = 0; i < missingIntervals; i++) {
    // missing data
    keyDataZ[i] = std::nan("");
    keyDataZLa[i] = std::nan("");
  }
  for (int i = missingIntervals; i < datadownIntervals; i++) {
    // link is up but not available
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] =
        10000 /* just to be different */ + (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataALa[i] = start - 2456;
    keyDataZLa[i] = start - 4324;
  }
  for (int i = 0; i < missingIntervals + 5; i++) {
    // missing data
    keyDataA[i] = std::nan("");
    keyDataALa[i] = std::nan("");
  }
  // just throwing some stuff in the middle
  keyDataA[missingIntervals + 50] = std::nan("");
  keyDataZ[missingIntervals + 50] = std::nan("");
  keyDataALa[missingIntervals + 50] = std::nan("");
  keyDataZLa[missingIntervals + 50] = std::nan("");
  for (int i = datadownIntervals; i < dataFetcher.numDataPoints_; i++) {
    // link is up and available
    keyDataA[i] = (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] =
        10000 /* just to be different */ + (i + 1) * SLOPE_PER_INTERVAL + start;
    keyDataALa[i] = keyDataALa[datadownIntervals - 1] +
        SLOPE_PER_INTERVAL * (i - datadownIntervals + 1);
    keyDataZLa[i] = keyDataZLa[datadownIntervals - 1] +
        SLOPE_PER_INTERVAL * (i - datadownIntervals + 1);
    ;
  }
  // just throwing some stuff in the middle
  keyDataA[datadownIntervals + 50] = std::nan("");
  keyDataZ[datadownIntervals + 50] = std::nan("");
  keyDataALa[datadownIntervals + 50] = std::nan("");
  keyDataZLa[datadownIntervals + 50] = std::nan("");
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime and Available is 100%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  // make sure linkAvailForData is not there meaning that it is unknown
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") == keyIt->second.items().end());
  // Only one event in output, since test should show 100% uptime
  ASSERT_EQ(keyIt->second["events"].size(), 3);

  // Ensure the correct start + end time and title
  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * missingIntervals));
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_AVAIL_UNKNOWN);

  ASSERT_EQ(
      keyIt->second["events"][1]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * missingIntervals));
  ASSERT_EQ(
      keyIt->second["events"][1]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * datadownIntervals));
  ASSERT_EQ(
      keyIt->second["events"][1]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_DATADOWN);

  ASSERT_EQ(
      keyIt->second["events"][2]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * datadownIntervals));
  ASSERT_EQ(
      keyIt->second["events"][2]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][2]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventNoDataAtAll) {
  // all samples are missing
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // missing data
    keyDataZ[i] = std::nan("");
    keyDataZLa[i] = std::nan("");
    keyDataA[i] = std::nan("");
    keyDataALa[i] = std::nan("");
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime and Available is 0%
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 0.0);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_EQ(keyIt->second["linkAvailForData"].asDouble(), 0.0);
  // no events
  ASSERT_EQ(keyIt->second["events"].size(), 0);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventDownThenUp) {
  // link starts down, then goes up
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int start = 3;
  int down2upInterval = 100;
  for (int i = 0; i < down2upInterval; i++) {
    keyDataZ[i] = 0;
    keyDataZLa[i] = 0;
    keyDataA[i] = std::nan("");
    keyDataALa[i] = std::nan("");
  }
  for (int i = down2upInterval; i < dataFetcher.numDataPoints_; i++) {
    // link is up
    keyDataA[i] = (i - down2upInterval + 1) * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = (i - down2upInterval + 1) * SLOPE_PER_INTERVAL + start + 4;
    keyDataALa[i] = keyDataA[i];
    keyDataZLa[i] = keyDataZ[i];
  }
  // just to make sure missing doesn't mess things up
  keyDataA[down2upInterval] = std::nan("");
  keyDataZ[down2upInterval] = std::nan("");
  keyDataALa[down2upInterval] = std::nan("");
  keyDataZLa[down2upInterval] = std::nan("");
  keyDataA[down2upInterval + 1] = std::nan("");
  keyDataZ[down2upInterval + 1] = std::nan("");
  keyDataALa[down2upInterval + 1] = std::nan("");
  keyDataZLa[down2upInterval + 1] = std::nan("");
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime/Availability is ~ 1 - down2upInterval/dataFetcher.numDataPoints_;
  double uptimeOrAvailApprox =
      (1.0 - down2upInterval / dataFetcher.numDataPoints_) * 100.0;
  ASSERT_TRUE(
      keyIt->second["linkAlive"].asDouble() > uptimeOrAvailApprox * 0.9);
  ASSERT_TRUE(
      keyIt->second["linkAlive"].asDouble() < uptimeOrAvailApprox * 1.1);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_TRUE(
      keyIt->second["linkAvailForData"].asDouble() > uptimeOrAvailApprox * 0.9);
  ASSERT_TRUE(
      keyIt->second["linkAvailForData"].asDouble() < uptimeOrAvailApprox * 1.1);

  ASSERT_EQ(keyIt->second["events"].size(), 1);

  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * down2upInterval));
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventUpDownDatadown) {
  // link starts up, then goes down, then goes up but not available
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int start = 34521;
  int up2downInterval = 100;
  int down2upInterval = 200;
  for (int i = 0; i < up2downInterval; i++) {
    // link is up and available
    keyDataA[i] = i * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = i * SLOPE_PER_INTERVAL + start + 5344;
    keyDataALa[i] = keyDataA[i] - 500;
    keyDataZLa[i] = keyDataZ[i] - 40;
  }

  // throw in a DB write error
  keyDataALa[50] -= 5;
  keyDataZLa[50] -= 5;
  keyDataALa[70] += 5;
  keyDataZLa[70] += 5;

  for (int i = up2downInterval; i < down2upInterval; i++) {
    // link is down
    keyDataA[i] = 0;
    keyDataZ[i] = 0;
    keyDataALa[i] = 0;
    keyDataZLa[i] = 0;
  }
  for (int i = down2upInterval; i < dataFetcher.numDataPoints_; i++) {
    // link is up but not available
    keyDataA[i] = (i - down2upInterval + 1) * SLOPE_PER_INTERVAL + 6;
    keyDataZ[i] = (i - down2upInterval + 1) * SLOPE_PER_INTERVAL + 9;
    keyDataALa[i] = 0;
    keyDataZLa[i] = 0;
  }
  // just to make sure missing doesn't mess things up
  keyDataA[up2downInterval] = std::nan("");
  keyDataZ[up2downInterval] = std::nan("");
  keyDataALa[up2downInterval] = std::nan("");
  keyDataZLa[up2downInterval] = std::nan("");

  keyDataA[down2upInterval] = std::nan("");
  keyDataALa[down2upInterval] = std::nan("");
  keyDataZ[down2upInterval] = std::nan("");
  keyDataZLa[down2upInterval] = std::nan("");
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());
  // Uptime ~ 1 - down2upInterval/dataFetcher.numDataPoints_;
  double uptimeApprox =
      (1.0 - (down2upInterval - up2downInterval) / dataFetcher.numDataPoints_) *
      100.0;
  double availApprox =
      (double)up2downInterval / dataFetcher.numDataPoints_ * 100.0;
  ASSERT_TRUE(keyIt->second["linkAlive"].asDouble() > uptimeApprox * 0.9);
  ASSERT_TRUE(keyIt->second["linkAlive"].asDouble() < uptimeApprox * 1.1);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_TRUE(keyIt->second["linkAvailForData"].asDouble() > availApprox * 0.9);
  ASSERT_TRUE(keyIt->second["linkAvailForData"].asDouble() < availApprox * 1.1);

  ASSERT_EQ(keyIt->second["events"].size(), 2);

  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * up2downInterval));
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);

  ASSERT_EQ(
      keyIt->second["events"][1]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * down2upInterval));
  ASSERT_EQ(
      keyIt->second["events"][1]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][1]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_DATADOWN);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventUpDatadownDown) {
  // link starts up and available, then DATADOWN, then down
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int start = 34521;
  int up2ddownInterval = 100;
  int ddown2downInterval = 200;
  for (int i = 0; i < up2ddownInterval; i++) {
    // link is up and available
    keyDataA[i] = i * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = i * SLOPE_PER_INTERVAL + start + 5344;
    keyDataALa[i] = keyDataA[i] - 500;
    keyDataZLa[i] = keyDataZ[i] - 40;
  }
  for (int i = up2ddownInterval; i < ddown2downInterval; i++) {
    // link is LINK_UP_DATADOWN
    keyDataA[i] = i * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = i * SLOPE_PER_INTERVAL + start + 5344;
    keyDataALa[i] = keyDataALa[i - 1];
    keyDataZLa[i] = keyDataZLa[i - 1];
  }
  for (int i = ddown2downInterval; i < dataFetcher.numDataPoints_; i++) {
    // link is down
    keyDataA[i] = 0;
    keyDataZ[i] = 0;
    keyDataALa[i] = 0;
    keyDataZLa[i] = 0;
  }
  // just to make sure missing doesn't mess things up
  keyDataA[ddown2downInterval] = std::nan("");
  keyDataZ[ddown2downInterval] = std::nan("");
  keyDataALa[ddown2downInterval] = std::nan("");
  keyDataZLa[ddown2downInterval] = std::nan("");

  keyDataA[2] = std::nan("");
  keyDataALa[2] = std::nan("");
  keyDataZ[2] = std::nan("");
  keyDataZLa[2] = std::nan("");
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  double uptimeApprox =
      (double)ddown2downInterval / dataFetcher.numDataPoints_ * 100.0;
  double availApprox =
      (double)up2ddownInterval / dataFetcher.numDataPoints_ * 100.0;
  ASSERT_TRUE(keyIt->second["linkAlive"].asDouble() > uptimeApprox * 0.9);
  ASSERT_TRUE(keyIt->second["linkAlive"].asDouble() < uptimeApprox * 1.1);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_TRUE(keyIt->second["linkAvailForData"].asDouble() > availApprox * 0.9);
  ASSERT_TRUE(keyIt->second["linkAvailForData"].asDouble() < availApprox * 1.1);

  ASSERT_EQ(keyIt->second["events"].size(), 2);

  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * up2ddownInterval));
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);

  ASSERT_EQ(
      keyIt->second["events"][1]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * up2ddownInterval));
  ASSERT_EQ(
      keyIt->second["events"][1]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * ddown2downInterval));
  ASSERT_EQ(
      keyIt->second["events"][1]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_DATADOWN);
}

TEST_F(BeringeiReaderLinkAvailableTest, EventDdownMissing) {
  // link is up the whole time, some missing samples in the middle
  // part of that time link is in datadown
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  double* keyDataALa = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZLa = new double[dataFetcher.numDataPoints_]{};
  int start = 34521;
  int up2ddownInterval = 100;
  int ddown2upInterval = 200;
  int ddownIntervals = 40;
  for (int i = 0; i < up2ddownInterval; i++) {
    // link is up and available
    keyDataA[i] = i * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = i * SLOPE_PER_INTERVAL + start + 5344;
    keyDataALa[i] = keyDataA[i];
    keyDataZLa[i] = keyDataZ[i];
  }
  for (int i = up2ddownInterval; i < ddown2upInterval; i++) {
    // link is LINK_UP_DATADOWN for part of this time
    keyDataA[i] = std::nan("");
    keyDataZ[i] = std::nan("");
    keyDataALa[i] = std::nan("");
    keyDataZLa[i] = std::nan("");
  }
  for (int i = ddown2upInterval; i < dataFetcher.numDataPoints_; i++) {
    // link is up and available
    keyDataA[i] = i * SLOPE_PER_INTERVAL + start;
    keyDataZ[i] = i * SLOPE_PER_INTERVAL + start + 5344;
    keyDataALa[i] = keyDataA[i] - SLOPE_PER_INTERVAL * ddownIntervals;
    keyDataZLa[i] = keyDataZ[i] - SLOPE_PER_INTERVAL * ddownIntervals;
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ, keyDataALa, keyDataZLa);
  // expect the linkName to be found
  auto keyIt = dataFetcher.output_["events"].find(keyMetaDataA_.linkName);

  ASSERT_TRUE(keyIt != dataFetcher.output_["events"].items().end());

  double availApprox =
      (1.0 - ddownIntervals / dataFetcher.numDataPoints_) * 100.0;
  ASSERT_EQ(keyIt->second["linkAlive"].asDouble(), 100.0);
  ASSERT_TRUE(
      keyIt->second.find("linkAvailForData") != keyIt->second.items().end());
  ASSERT_TRUE(keyIt->second["linkAvailForData"].asDouble() > availApprox * 0.9);
  ASSERT_TRUE(keyIt->second["linkAvailForData"].asDouble() < availApprox * 1.1);

  ASSERT_EQ(keyIt->second["events"].size(), 3);

  ASSERT_EQ(
      keyIt->second["events"][0]["startTime"].asInt(),
      queryRequest_.startTsSec);
  ASSERT_EQ(
      keyIt->second["events"][0]["endTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * up2ddownInterval));
  ASSERT_EQ(
      keyIt->second["events"][0]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);

  ASSERT_EQ(
      keyIt->second["events"][1]["startTime"].asInt(),
      queryRequest_.startTsSec + (intervalInSeconds_ * up2ddownInterval));
  ASSERT_EQ(
      keyIt->second["events"][1]["endTime"].asInt(),
      queryRequest_.startTsSec +
          (intervalInSeconds_ * (ddownIntervals + up2ddownInterval + 1)));
  ASSERT_EQ(
      keyIt->second["events"][1]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP_DATADOWN);

  ASSERT_EQ(
      keyIt->second["events"][2]["startTime"].asInt(),
      queryRequest_.startTsSec +
          (intervalInSeconds_ * (ddownIntervals + up2ddownInterval + 1)));
  ASSERT_EQ(
      keyIt->second["events"][2]["endTime"].asInt(), queryRequest_.endTsSec);
  ASSERT_EQ(
      keyIt->second["events"][2]["linkState"].asInt(),
      (int)stats::LinkStateType::LINK_UP);
}
