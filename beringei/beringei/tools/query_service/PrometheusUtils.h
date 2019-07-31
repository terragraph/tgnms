/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "CurlUtil.h"

#include "beringei/if/gen-cpp2/Aggregator_types_custom_protocol.h"
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

  // get singleton instance of class
  static std::shared_ptr<PrometheusUtils> getInstance();

  // poll latest batch of metrics and erase fetched metrics
  std::vector<std::string> pollMetrics(const int intervalSec);

  // signal for kafka workers to stop publishing
  bool isQueueFull(const int intervalSec);

  // write statistics from nodes - adding label meta-data based on topology
  // polling
  bool writeNodeStats(
      const int intervalSec,
      const std::vector<terragraph::thrift::AggrStat>& statQueue);

  // write metrics directly to queue without additional tagging
  bool enqueueMetrics(
      const int intervalSec,
      const std::vector<Metric>& aggValues);

  // format network name
  static std::string formatNetworkLabel(const std::string& topologyName);
  // format key/label names by removing characters disallowed by prometheus
  static std::string formatPrometheusKeyName(const std::string& keyName);
  // query prometheus API
  static struct CurlResponse prometheusQuery(
      const std::string& uri,
      const std::vector<std::pair<std::string, std::string>>& postData);

 private:
  // store the last set of node metrics for prometheus to poll
  folly::Synchronized<std::unordered_map<
      int /* interval (sec) */,
      std::vector<Metric>>>
      nodeMetricsByInterval_;
};

} // namespace gorilla
} // namespace facebook
