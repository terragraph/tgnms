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

class BeringeiReaderDataPointsTest : public testing::Test {
 protected:
  void SetUp() override {
    // set up data for fake query request
    queryRequest_.topologyName = "Test Network";
    queryRequest_.aggregation = stats::GraphAggregation::NONE;
    queryRequest_.outputFormat = stats::StatsOutputFormat::RAW;
    queryRequest_.maxResults = 0;
    //queryRequest_.maxDataPoints = 1440;
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
    std::string keyName = "LinkStatName";
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
    keyName = "LinkStatName";
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

/**
 * Ensure proper handling of averaging data points.
 */
TEST_F(BeringeiReaderDataPointsTest, DataPointLimiterAveraging) {
  // Create BeringeiData with query request and process query
  queryRequest_.maxDataPoints = 10;
  queryRequest_.__isset.maxDataPoints = true;
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // alternate between values 10 and 20 for easy averaging test
    keyDataA[i] = i % 2 ? 10 : 20;
    keyDataZ[i] = i % 2 ? 10 : 20;
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  auto& node1 = dataFetcher.output_["Node-1 / LinkStatName"];
  // expect data points to be <= max size
  ASSERT_LE(node1.size(), queryRequest_.maxDataPoints);
  for (const auto& metricValue : node1) {
    // averaged metric must be in between our min<->max values
    ASSERT_GT(metricValue.asDouble(), 10);
    ASSERT_LT(metricValue.asDouble(), 20);
  }
}

/**
 * Ensure proper handling of data point limiting.
 */
TEST_F(BeringeiReaderDataPointsTest, DataPointLimiterCount) {
  // Create BeringeiData with query request and process query
  // test a max DP count of 1 <-> numDataPoints_
  for (int maxDp = 1; maxDp <= 2880; maxDp++) {
    queryRequest_.maxDataPoints = maxDp;
    queryRequest_.__isset.maxDataPoints = true;
    BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
    ASSERT_NO_THROW(dataFetcher.setTimeWindow());
    double* keyDataA = new double[dataFetcher.numDataPoints_]{};
    double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
    for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
      // alternate between values 10 and 20 for easy averaging test
      keyDataA[i] = 20;
      keyDataZ[i] = 20;
    }
    // process query
    process(dataFetcher, keyDataA, keyDataZ);
    auto& node1 = dataFetcher.output_["Node-1 / LinkStatName"];
    // expect data points to be <= max size
    ASSERT_LE(node1.size(), queryRequest_.maxDataPoints);
    ASSERT_GT(node1.size(), 0);
  }
}

/**
 * Ensure proper time output when data point averaging (maxDataPoints)
 * is set.
 */
TEST_F(BeringeiReaderDataPointsTest, DataPointTime) {
  queryRequest_.maxDataPoints = 100;
  queryRequest_.__isset.maxDataPoints = true;
  queryRequest_.outputFormat = stats::StatsOutputFormat::POINTS;
  BeringeiReader dataFetcher(typeaheadCache_, queryRequest_);
  ASSERT_NO_THROW(dataFetcher.setTimeWindow());
  double* keyDataA = new double[dataFetcher.numDataPoints_]{};
  double* keyDataZ = new double[dataFetcher.numDataPoints_]{};
  for (int i = 0; i < dataFetcher.numDataPoints_; i++) {
    // alternate between values 10 and 20 for easy averaging test
    keyDataA[i] = 20;
    keyDataZ[i] = 20;
  }
  // process query
  process(dataFetcher, keyDataA, keyDataZ);
  auto& points = dataFetcher.output_["points"];
  ASSERT_LE(points.size(), queryRequest_.maxDataPoints);
  ASSERT_EQ(points[0][0].asDouble(), queryRequest_.startTsSec * 1000);
  auto& lastPoint = points[points.size() - 1];
  ASSERT_LT(lastPoint[0].asDouble(), queryRequest_.endTsSec * 1000);
  // last data point is
  // 2880 (total dps) / 100 (max dps to display) * 30 (interval in seconds)
  // = 864 seconds = 14.4 minutes
  ASSERT_GT(lastPoint[0].asDouble(), queryRequest_.endTsSec - (15 * 60) * 1000);
}
