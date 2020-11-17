/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "if/gen-cpp2/Aggregator_types_custom_protocol.h"
#include "if/gen-cpp2/Stats_types_custom_protocol.h"

namespace facebook {
namespace terragraph {
namespace stats {

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
  // write statistics from nodes - adding label meta-data based on topology
  // polling
  static bool writeNodeStats(
      const std::string& jobName,
      const int intervalSec,
      const std::vector<terragraph::thrift::AggrStat>& statQueue);

  // write metrics to the push gateway
  static bool enqueueMetrics(
      const std::string& jobName,
      const std::vector<Metric>& metricList);

  // format metric names by removing characters disallowed by prometheus
  static std::string formatPrometheusMetricName(const std::string& metricName);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
