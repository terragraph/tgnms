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

#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/beringei_query_types_custom_protocol.h"

#include <folly/Synchronized.h>

namespace facebook {
namespace gorilla {

struct Metric {
  std::string name;
  time_t ts = 0;
  double value;
  std::vector<std::string> prometheusLabels;

  explicit Metric(){};
  explicit Metric(const std::string& name, time_t ts, double value)
      : name(name), ts(ts), value(value){};
  explicit Metric(
      const std::string& name,
      const time_t ts,
      const std::vector<std::string>& prometheusLabels,
      double value)
      : name(name), ts(ts), prometheusLabels(prometheusLabels), value(value){};
};

class PrometheusUtils {
 public:
  explicit PrometheusUtils();
  static std::shared_ptr<PrometheusUtils> getInstance();
  // poll latest batch of metrics and erase fetched metrics
  std::vector<std::string> pollMetrics(
      TACacheMap& typeaheadCache,
      const int intervalSec);

  void writeNodeMetrics(
      TACacheMap& typeaheadCache,
      const query::StatsWriteRequest& request);
  void formatStatsRequestAsPrometheusMetrics(
      std::vector<Metric>& prometheusMetricOutput,
      TACacheMap& typeaheadCache,
      const query::StatsWriteRequest& request);
  void writeMetrics(
      const int intervalSec,
      const std::vector<Metric>& aggValues);
  static std::string formatNetworkLabel(const std::string& topologyName);
  static std::string formatPrometheusKeyName(const std::string& keyName);

 private:
  // store the last set of node metrics for prometheus to poll
  folly::Synchronized<std::unordered_map<
      int /* interval (sec) */,
      std::vector<std::vector<Metric>>>>
      nodeMetricsByInterval_;
};

} // namespace gorilla
} // namespace facebook
