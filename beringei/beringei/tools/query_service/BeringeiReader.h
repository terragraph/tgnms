/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "StatsTypeAheadCache.h"

#include <folly/Memory.h>
#include <folly/Singleton.h>
#include <folly/Synchronized.h>
#include <folly/dynamic.h>
#include <folly/futures/Future.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

typedef std::vector<std::pair<Key, std::vector<TimeValuePair>>> TimeSeries;

class BeringeiReader {
 public:
  explicit BeringeiReader(
      TACacheMap& typeaheadCache,
      stats::QueryRequest& request);

  folly::dynamic process();
  static time_t getTimeInMs();

 private:
  std::string getTimeStr(time_t timeSec);
  // query validation
  bool validateQuery();
  // lookup topology cache
  // add key id -> KeyMetaData
  // apply restrictors
  void loadKeyMetaData();
  // compute time interval
  bool setTimeWindow();
  // fetch beringei data
  void fetchBeringeiData();
  // apply graph aggregation (NONE, SUM, TOP_AVG)
  void graphAggregation();
  void graphAggregationSum();
  void sumTimeSeriesForSorting();
  void graphAggregationTop();
  void graphAggregationBottom();
  void graphAggregationAvg();
  void graphAggregationCount();
  void graphAggregationLatest();
  void graphAggregationStats();
  // apply max results
  void limitResults();
  // apply max data points/avg
  void limitDataPoints();
  // format (POINTS, RAW, ...)
  void formatData();
  // format data in EVENT format
  void formatDataEvent(bool isLink = false);
  // create+insert new key w/ meta-data
  void createLinkKey(
      const std::string& keyName,
      double value,
      const std::string& linkName,
      const stats::LinkDirection& linkDirection);
  // helper
  void createLinkKey(
      const std::string& keyName,
      double value,
      const KeyMetaData& metaDataExisting);

  // clean-up memory
  void cleanUp();

  time_t startTime_;
  time_t endTime_;
  int32_t timeInterval_;
  int32_t numDataPoints_;
  // generated key id
  // used for generating new key names with createLinkKey(..)
  // TODO - this has overlapping key space potential, just like aggregate keys
  int64_t genKeyIndex_;
  TimeSeries beringeiTimeSeries_{};
  folly::dynamic output_{};
  TACacheMap typeaheadCache_;
  stats::QueryRequest request_;
  std::unordered_map<std::string /* key id */, KeyMetaData> keyDataList_{};
  std::unordered_map<std::string /* key id */, double*> keyTimeSeries_{};
  std::unordered_map<std::string /* aggregate name */, double*>
      aggregateKeyTimeSeries_{};
  std::unordered_map<std::string /* key id */, double> valuePerKey_{};
  // used when we need a sorted value for later limiting (top, bottom
  // aggregations)
  std::vector<std::pair<std::string, double>> sortedValuePerKey_{};
};

} // namespace gorilla
} // namespace facebook
