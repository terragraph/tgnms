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
#include <folly/dynamic.h>
#include <folly/futures/Future.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/beringei_query_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

typedef std::vector<std::pair<Key, std::vector<TimeValuePair>>> TimeSeries;
struct QueryWindow {
  time_t startTime;
  time_t endTime;
  int checkResult;
};

// RawReadeadBeringeiData will read the data and return all;
// Will be Used By PyReadHandler
// Input: RawReadQueryRequest, which is list of RawReadQuery
// Output: RawRead output
// Note, it is possible to create template to share between
// RawReadBeringeiData and BeringeiData. However, given the little amount of
// shared code and little processing in common, I separate them for now.
class RawReadBeringeiData {
 public:
  explicit RawReadBeringeiData(TACacheMap& typeaheadCache);

  RawQueryReturn process(query::RawReadQueryRequest& rawReadQueryRequest);

 private:
  // Pre-process the query
  struct QueryWindow validateQuery(const query::RawReadQuery& request);
  GetDataRequest createBeringeiRequest(
      const query::RawReadQuery& request,
      const int numShards,
      QueryWindow queryWindow);

  RawTimeSeriesList handleQuery(query::RawReadQuery rawReadQuery);

  RawTimeSeriesList generateRawOutput(
      query::RawReadQuery rawReadQuery,
      TimeSeries beringeiTimeseries);

  int64_t findBeringeiKeyId(query::RawQueryKey rawQueryKey);

  TACacheMap& typeaheadCache_;
  TimeSeries beringeiTimeSeries_;
  std::vector<std::string> fullMetricKeyName_;
  std::vector<bool> successFindKeyId_;
  static const int kFail = -1;
  static const int kSuccess = 0;
};

} // namespace gorilla
} // namespace facebook
