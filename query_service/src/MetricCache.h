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
#include <folly/futures/Future.h>
#include <folly/Optional.h>

#include "if/gen-cpp2/beringei_query_types_custom_protocol.h"
#include "if/gen-cpp2/Stats_types_custom_protocol.h"
#include "if/gen-cpp2/Topology_types_custom_protocol.h"

#define MAC_ADDR_LEN 17

using namespace facebook::stats;
using namespace facebook::terragraph;

namespace facebook {
namespace gorilla {

struct NodeLinkMetricKey {
  explicit NodeLinkMetricKey(
      const std::string& radioMac,
      const std::string& keyName,
      const stats::LinkDirection& linkDirection)
      : radioMac(radioMac), keyName(keyName), linkDirection(linkDirection){};
  std::string radioMac;
  std::string keyName;
  stats::LinkDirection linkDirection;
};

struct NodeLinkMetrics {
  explicit NodeLinkMetrics(
      const std::string& title,
      const std::string& description)
      : title(title), description(description), keys({}){};
  std::string title;
  std::string description;
  std::vector<NodeLinkMetricKey> keys;
};

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

  void updateMetricNames(const thrift::Topology& request);

  // generate link metric meta-data for quick stream processing lookups
  folly::Optional<NodeLinkMetrics> createLinkMetric(
      const thrift::Link& link,
      const stats::LinkMetric& linkMetric);

  folly::Optional<stats::KeyMetaData> getKeyDataByNodeKey(
      const std::string& nodeMac,
      const std::string& keyName) const;

  folly::Optional<std::pair<std::string, thrift::Node>> getNodeByMacAddr(
      const std::string& macAddr);

  folly::Optional<
      std::unordered_map<std::string /* key name */, stats::KeyMetaData>>
  getNodeMetricCache(const std::string& macAddr);

 private:
  // Tag Node struct per MAC
  folly::Synchronized<std::unordered_map<
      std::string /* MAC addr */,
      std::pair<std::string /* topology name */, thrift::Node>>>
      nodeByMac_;
  // --- Metrics per node --- //
  // map node mac -> key names
  MetricCacheMap nodeMacToKeyList_{};
};

} // namespace gorilla
} // namespace facebook
