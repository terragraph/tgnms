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

#include "if/gen-cpp2/QueryService_types_custom_protocol.h"
#include "if/gen-cpp2/Stats_types_custom_protocol.h"
#include "if/gen-cpp2/Topology_types_custom_protocol.h"

#define MAC_ADDR_LEN 17

namespace facebook {
namespace terragraph {
namespace stats {

struct NodeLinkMetricKey {
  explicit NodeLinkMetricKey(
      const std::string& radioMac,
      const std::string& keyName,
      const thrift::LinkDirection& linkDirection)
      : radioMac(radioMac), keyName(keyName), linkDirection(linkDirection){};
  std::string radioMac;
  std::string keyName;
  thrift::LinkDirection linkDirection;
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
    std::unordered_map<std::string /* key name */, thrift::KeyMetaData>>>;
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
      const thrift::LinkMetric& linkMetric);

  folly::Optional<thrift::KeyMetaData> getKeyDataByNodeKey(
      const std::string& nodeMac,
      const std::string& keyName) const;

  folly::Optional<std::pair<std::string, thrift::Node>> getNodeByMacAddr(
      const std::string& macAddr);

  folly::Optional<
      std::unordered_map<std::string /* key name */, thrift::KeyMetaData>>
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

} // namespace stats
} // namespace terragraph
} // namespace facebook
