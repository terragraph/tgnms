/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "RuckusController.h"
#include "StatsTypeAheadCache.h"

#include <folly/io/async/EventBaseManager.h>
#include <folly/Synchronized.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class AggregatorService {
 public:
  explicit AggregatorService(
    TACacheMap& typeaheadCache,
    std::shared_ptr<BeringeiConfigurationAdapterIf> configurationAdapter,
    std::shared_ptr<BeringeiClient> beringeiReadClient,
    std::shared_ptr<BeringeiClient> beringeiWriteClient);

  // run eventbase
  void start();
  void timerCb();
  void ruckusControllerCb();
  // fetch ruckus ap stats
  void fetchRuckusStats();
  void ruckusControllerStats();
  // requests topology from an api_service endpoint
  query::Topology fetchTopology();
  void buildQuery(
    std::unordered_map<std::string, double>& values,
    const std::unordered_set<std::string>& popNodeNames,
    const std::shared_ptr<StatsTypeAheadCache> cache);

 private:
  folly::EventBase eb_;
  std::unique_ptr<folly::AsyncTimeout> timer_{nullptr};
  std::unique_ptr<folly::AsyncTimeout> ruckusTimer_{nullptr};
  // from queryservicefactory
  TACacheMap& typeaheadCache_;
  std::shared_ptr<BeringeiConfigurationAdapterIf> configurationAdapter_;
  std::shared_ptr<BeringeiClient> beringeiReadClient_;
  std::shared_ptr<BeringeiClient> beringeiWriteClient_;
  // store the last set of ruckus stats to push
  folly::Synchronized<std::unordered_map<std::string /* key name */, double>>
      ruckusStats_{};
  RuckusController ruckusController_;
};
}
} // facebook::gorilla
