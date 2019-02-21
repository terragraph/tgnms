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

#include "beringei/if/gen-cpp2/beringei_query_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

struct Metric {
  std::string name;
  time_t ts = 0;
  double value;
  std::vector<std::string> prometheusLabels;

  explicit Metric() {};
  explicit Metric(const std::string& name, double value)
    : name(name), value(value) {};
  explicit Metric(const std::string& name, time_t ts, double value)
    : name(name), ts(ts), value(value) {};
  explicit Metric(const std::string& name,
                  const std::vector<std::string>& prometheusLabels,
                  double value)
    : name(name),
      prometheusLabels(prometheusLabels),
      value(value) {};
};

class PrometheusUtils {
 public:
  static void writeNodeMetrics(
      TACacheMap& typeaheadCache,
      const query::StatsWriteRequest& request);
  static void writeMetrics(
      const std::string& topologyName,
      const std::string& jobName, /* unique identifier */
      const std::vector<Metric>& aggValues);
  static std::string formatPrometheusKeyName(const std::string& keyName);

 private:
  static void forwardMetricsToPrometheus(
      const std::string& topologyName,
      const std::string& jobName, /* unique identifier */
      const std::vector<std::string>& prometheusDataPoints);
};

} // namespace gorilla
} // namespace facebook
