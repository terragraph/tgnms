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

// RawReadBeringeiData will read the data and return all;
// Will be Used By PyReadHandler
// Input: RawReadQueryRequest, which is list of RawReadQuery
// Output: RawRead output
// Note, it is possible to create template to share between
// RawRBeringeiData and BeringeiData. However, given the little amount of
// shared code and little processing in common, I seperate them for now.
class RawReadBeringeiData {
 public:
  explicit RawReadBeringeiData(const query::RawReadQueryRequest& request,
                               TACacheMap& typeaheadCache);

  RawQueryReturn process();

 private:
  // Pre-process the query
  void validateQuery(const query::RawReadQuery& request);
  GetDataRequest createBeringeiRequest(
      const query::RawReadQuery& request,
      const int numShards);

  // This function uses a list of Beringei Query and send to the Beringei Data
  // Base for data. It returns a list of the obtianed time series, i.e., the
  // query return for a single RawReadQuery.
  RawTimeSeriesList handleQuery();

  // Write the obtained time series to output
  RawTimeSeriesList LogRawOutput();
  // Used to find the Beringei KeyId by a_mac, <optional> z_mac, metric_name
  long long int FindBeringeiKeyId(query::RawQueryKey raw_query_key);

  // request data
  query::RawReadQueryRequest request_;
  query::RawReadQuery query_;
  time_t startTime_;
  time_t endTime_;
  TimeSeries beringeiTimeSeries_;
  TACacheMap& typeaheadCache_;
  // regular key time series
  std::vector<std::vector<double>> timeSeries_;
};

} // namespace gorilla
} // namespace facebook
