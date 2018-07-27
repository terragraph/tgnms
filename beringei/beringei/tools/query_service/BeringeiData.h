/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <folly/Memory.h>
#include <folly/Singleton.h>
#include <folly/dynamic.h>
#include <folly/futures/Future.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/beringei_query_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

typedef std::vector<std::pair<Key, std::vector<TimeValuePair>>> TimeSeries;

class BeringeiData {
 public:
  explicit BeringeiData(const query::QueryRequest& request);

  folly::dynamic process();

 private:
  enum UptimeState {
    UP = 1,
    DOWN = 2,
    MISSING = 3, // State is implied to be UP from nearby data points with state
                 // "UP" though the data is missing
    UNKNOWN = 4, // State cannot be inferred, data is missing, state is unknown
  };

  enum MetricType {
    LINK = 1,
    NODE = 2,
  };

  typedef std::unordered_map<std::string /* key ID */, std::deque<UptimeState>>
      KeyUptimeStateMap;

  KeyUptimeStateMap uptimeHandler(
      const double dataPointIncrementMs,
      const int timeBucketLength);

  void resolveLinkUptimeDifference(KeyUptimeStateMap& keysToUptimeStates);

  int getShardId(const std::string& key, const int numShards);

  void validateQuery(const query::Query& request);
  GetDataRequest createBeringeiRequest(
      const query::Query& request,
      const int numShards);

  /**
   * Determine column names to use based on KeyData
   */
  void columnNames();
  /**
   * Transform the data from TimeValuePairs into lists of
   * data points, filling missing data with 0s.
   * timeBuckets_ size should be the same as each key's time series
   */
  void valueOrNull(folly::dynamic& obj, double value, int count = 1);
  folly::dynamic transform();
  folly::dynamic latest();
  folly::dynamic handleQuery();
  void selectBeringeiDb(int32_t interval /* seconds */);

  folly::dynamic eventHandler(
      const double dataPointIncrementMs,
      const std::string& metricName,
      const MetricType metricType);
  folly::dynamic analyzerTable(int beringeiTimeWindowS);
  folly::dynamic makeEvent(int64_t startIndex, int64_t endIndex);
  std::string getTimeStr(time_t timeSec);
  double calculateAverage(
      double* timeSeries,
      bool* valid,
      int timeSeriesStartIndex,
      int minIdx,
      int maxIdx,
      bool mcsflag);

  // request data
  query::QueryRequest request_;
  query::Query query_;
  time_t startTime_;
  time_t endTime_;
  int32_t timeInterval_;
  std::vector<std::string> columnNames_;
  TimeSeries beringeiTimeSeries_;
  // regular key time series
  std::vector<std::vector<double>> timeSeries_;
  // aggregated series (avg, min, max, sum, count)
  // all displayed by default
  std::unordered_map<std::string, std::vector<double>> aggSeries_;
};

} // namespace gorilla
} // namespace facebook
