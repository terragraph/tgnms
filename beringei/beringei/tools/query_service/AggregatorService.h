/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "PrometheusUtils.h"
#include "StatsTypeAheadCache.h"
#include "WirelessController.h"

#include <folly/Synchronized.h>
#include <folly/io/async/EventBaseManager.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/beringei_query_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class AggregatorService {
 public:
  explicit AggregatorService(TACacheMap& typeaheadCache);
  // loop eventbase
  void start();

 private:
  folly::EventBase eb_;
  std::unique_ptr<folly::AsyncTimeout> timer_{nullptr};
  // from queryservicefactory
  TACacheMap& typeaheadCache_;


  // schedule timer in a loop for periodic work
  void timerCb();
  // perform all periodic work
  void doPeriodicWork();
  // query and log topology based metrics (nodes & links online)
  void fetchAndLogTopologyMetrics(
      std::vector<Metric>& aggValues,
      const query::Topology& topology);
  // query and log wireless controller metrics
  void fetchAndLogWirelessControllerMetrics(
      std::vector<Metric>& aggValues,
      const query::TopologyConfig& topologyConfig);
  void fetchAndLogRuckusControllerMetrics(
      std::vector<Metric>& aggValues,
      const query::TopologyConfig& topologyConfig);
  // create datapoints from metrics
  void createDataPoints(
      std::vector<DataPoint>& bDataPoints,
      const std::vector<Metric>& aggValues,
      std::shared_ptr<query::TopologyConfig> topologyConfig);
  // store metrics in beringei backend
  void storeAggregateMetrics(std::vector<DataPoint>& bDataPoints);
};
} // namespace gorilla
} // namespace facebook
