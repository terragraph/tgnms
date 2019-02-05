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
#include <folly/Synchronized.h>
#include <folly/dynamic.h>
#include <folly/futures/Future.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/client/BeringeiConfigurationAdapterIf.h"
#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"

#define MAC_ADDR_LEN 17

using namespace facebook::stats;

namespace facebook {
namespace gorilla {

/**
 * Hold the type-ahead meta-data for a topology
 */
class StatsTypeAheadCache {
 public:
  StatsTypeAheadCache();

  void fetchMetricNames(query::Topology& request);

  folly::dynamic createLinkMetric(
      const query::Node& aNode,
      const query::Node& zNode,
      const std::string& title,
      const std::string& description,
      const std::string& keyName,
      const stats::KeyUnit& keyUnit = stats::KeyUnit::NONE,
      const std::string& keyPrefix = "tgf");
  folly::dynamic createLinkMetricAsymmetric(
      const query::Node& aNode,
      const query::Node& zNode,
      const std::string& title,
      const std::string& description,
      const std::string& keyNameA,
      const std::string& keyNameZ,
      const stats::KeyUnit& keyUnit = stats::KeyUnit::NONE,
      const std::string& keyPrefix = "tgf");

  folly::dynamic getLinkMetrics(
      const std::string& metricName,
      const query::Node& aNode,
      const query::Node& zNode);

  // fetch topology-wide key data
  std::vector<stats::KeyMetaData> getKeyData(
      const std::string& metricName) const;

  // type-ahead search
  std::vector<std::vector<stats::KeyMetaData>> searchMetrics(
      const std::string& metricName,
      stats::TypeaheadRequest& request,
      const int limit = 100);

  // list (array) of node MAC addresses
  folly::dynamic listNodes();

  // list (array) of node MAC addresses linked to nodeA
  folly::dynamic listNodes(
      const std::string& nodeAstr,
      const std::string& topologyName);

 private:
  std::vector<std::string> linkMetricKeyNames_{};
  std::unordered_set<std::string> macNodes_{};
  std::map<std::string /* node name */, query::Node> nodesByName_{};
  // --- Metrics per node --- //
  // map node mac -> key names
  std::unordered_map<
      std::string, /* MAC addr */
      std::unordered_map<
          std::string /* key name */,
          std::shared_ptr<stats::KeyMetaData>>>
      nodeMacToKeyList_{};

  // --- Metrics for all nodes --- //
  // key names => [metric id]
  std::unordered_map<std::string /* key name */, std::vector<int>>
      keyToMetricIds_{};
  // short names => [metric ids]
  std::unordered_map<std::string /* short name */, std::vector<int>>
      nameToMetricIds_{};
  // metric id => meta data
  std::unordered_map<int /* key id */, std::shared_ptr<stats::KeyMetaData>>
      metricIdMetadata_{};
  folly::Optional<std::string> macToNodeName(const std::string& nameOrMacAddr);
  folly::Optional<std::string> nodeNameToMac(const std::string& nameOrMacAddr);
  std::shared_ptr<query::Topology> topologyNameToInstance(
      std::string topologyName);

  // TODO - graph struct for quick traversal
};

using TACacheMap = folly::Synchronized<
    std::unordered_map<std::string, std::shared_ptr<StatsTypeAheadCache>>>;

} // namespace gorilla
} // namespace facebook
