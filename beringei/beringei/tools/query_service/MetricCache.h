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
#include <folly/Synchronized.h>
#include <folly/dynamic.h>
#include <folly/futures/Future.h>

#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"

#define MAC_ADDR_LEN 17

using namespace facebook::stats;

namespace facebook {
namespace gorilla {

using MetricCacheMap = folly::Synchronized<std::unordered_map<
    std::string, /* MAC addr */
    std::unordered_map<std::string /* key name */, stats::KeyMetaData>>>;
/**
 * Hold the type-ahead meta-data for a topology
 */
class MetricCache {
 public:
  explicit MetricCache(){};

  static std::shared_ptr<MetricCache> getInstance();

  void updateMetricNames(const query::Topology& request);

  // TODO - no folly dynamic
  folly::dynamic createLinkMetric(
      const query::Node& aNode,
      const query::Node& zNode,
      const stats::LinkMetric& linkMetric);

  folly::Optional<stats::KeyMetaData> getKeyDataByNodeKey(
      const std::string& nodeMac,
      const std::string& keyName) const;

  folly::Optional<std::pair<std::string, query::Node>> getNodeByMacAddr(
      const std::string& macAddr);

  folly::Optional<
      std::unordered_map<std::string /* key name */, stats::KeyMetaData>>
  getNodeMetricCache(const std::string& macAddr);

 private:
  // Tag Node struct per MAC
  folly::Synchronized<std::unordered_map<
      std::string /* MAC addr */,
      std::pair<std::string /* topology name */, query::Node>>>
      nodeByMac_;
  // --- Metrics per node --- //
  // map node mac -> key names
  MetricCacheMap nodeMacToKeyList_{};
};

} // namespace gorilla
} // namespace facebook
