/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "MetricCache.h"

#include "MySqlClient.h"
#include "TopologyStore.h"

#include <folly/MacAddress.h>
#include <folly/Optional.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <iostream>
#include <regex>

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

/**
 * Hold the type-ahead meta-data for a topology
 */

static folly::Singleton<MetricCache> storeInstance_;

std::shared_ptr<MetricCache> MetricCache::getInstance() {
  return storeInstance_.try_get();
}

folly::Optional<stats::KeyMetaData> MetricCache::getKeyDataByNodeKey(
    const std::string& nodeMac,
    const std::string& keyName) const {
  auto nodeKeyLookupLock = nodeMacToKeyList_.rlock();
  auto nodeIt = nodeKeyLookupLock->find(nodeMac);
  if (nodeIt != nodeKeyLookupLock->end()) {
    auto keyDataIt = nodeIt->second.find(keyName);
    if (keyDataIt != nodeIt->second.end()) {
      return keyDataIt->second;
    }
  }
  return folly::none;
}

folly::Optional<std::pair<std::string, query::Node>>
MetricCache::getNodeByMacAddr(const std::string& macAddr) {
  auto nodeLookupLock = nodeByMac_.rlock();
  auto nodeIt = nodeLookupLock->find(macAddr);
  if (nodeIt != nodeLookupLock->end()) {
    return nodeIt->second;
  }
  return folly::none;
}

folly::Optional<
    std::unordered_map<std::string /* key name */, stats::KeyMetaData>>
MetricCache::getNodeMetricCache(const std::string& macAddr) {
  auto nodeKeyLookupLock = nodeMacToKeyList_.rlock();
  auto nodeIt = nodeKeyLookupLock->find(macAddr);
  if (nodeIt != nodeKeyLookupLock->end()) {
    return nodeIt->second;
  }
  return folly::none;
}

void MetricCache::updateMetricNames(const query::Topology& request) {
  folly::dynamic nodeData;
  std::map<std::string /* node name */, query::Node> nodesByName;
  std::unordered_set<std::string> macNodes;

  if (request.nodes.empty()) {
    LOG(ERROR) << "No nodes in topology, failing request";
    return;
  }
  for (auto& node : request.nodes) {
    // no stats if no mac address defined
    if (node.mac_addr.empty()) {
      continue;
    }
    auto macAddr = node.mac_addr;
    std::transform(macAddr.begin(), macAddr.end(), macAddr.begin(), ::tolower);
    // index mac -> node
    {
      auto nodeByMacLock = nodeByMac_.wlock();
      // record the topology name + node struct
      (*nodeByMacLock)[macAddr] = std::make_pair(request.name, node);
    }
    macNodes.insert(macAddr);
    nodesByName[node.name] = node;
  }
  auto mySqlClient = MySqlClient::getInstance();
  LinkMetricMap allLinkMetrics = mySqlClient->getLinkMetrics();
  {
    auto nodeKeyLookupLock = nodeMacToKeyList_.wlock();
    for (auto& link : request.links) {
      VLOG(3) << "Link: " << link.name;
      // skip wired links
      if (link.link_type != query::LinkType::WIRELESS) {
        continue;
      }
      auto aNode = nodesByName[link.a_node_name];
      auto zNode = nodesByName[link.z_node_name];
      for (const auto& linkMetric : allLinkMetrics) {
        folly::dynamic linkMetrics =
            createLinkMetric(aNode, zNode, linkMetric.second);
        if (!linkMetrics.count("keys")) {
          continue;
        }
        for (auto& key : linkMetrics["keys"]) {
          auto node = SimpleJSONSerializer::deserialize<query::Node>(
              key["node"].asString());

          auto mac = node.mac_addr;
          auto keyName = key["keyName"].asString();
          // match case
          std::transform(
              keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
          // short name should already be tagged
          stats::KeyMetaData& keyData =
              (*nodeKeyLookupLock)[mac][keyName];
          // push key data for link metric
          keyData.topologyName = request.name;
          keyData.linkName = link.name;
          keyData.shortName = linkMetric.first;
          keyData.linkDirection =
              (stats::LinkDirection)(key["linkDirection"].asInt());
          // update the unit
          if (key.count("unit")) {
            stats::KeyUnit unit = (stats::KeyUnit)(key["unit"].asInt());
            keyData.unit = unit;
          }
          // copy to short key name for lookups
          (*nodeKeyLookupLock)[mac][linkMetric.first] = keyData;
          VLOG(3) << "\tLoaded key: [" << mac << "][" << keyData.shortName << "]";
        }
      }
    }
  }
}

// TODO - convert this to thrift struct
folly::dynamic MetricCache::createLinkMetric(
    const query::Node& aNode,
    const query::Node& zNode,
    const stats::LinkMetric& linkMetric) {
  if (aNode.mac_addr.empty() || zNode.mac_addr.empty()) {
    VLOG(1) << "Empty MAC for link " << aNode.name << " <-> " << zNode.name;
    return folly::dynamic::object();
  }
  return folly::dynamic::object("title", linkMetric.shortName)(
      "description", linkMetric.description)("scale", NULL)(
      "keys",
      folly::dynamic::array(
          folly::dynamic::object(
              "node", SimpleJSONSerializer::serialize<std::string>(aNode))(
              "keyName",
              linkMetric.keyPrefix + "." + zNode.mac_addr + "." +
                  linkMetric.keyName)(
              "linkDirection", (int)stats::LinkDirection::LINK_A),
          folly::dynamic::object(
              "node", SimpleJSONSerializer::serialize<std::string>(zNode))(
              "keyName",
              linkMetric.keyPrefix + "." + aNode.mac_addr + "." +
                  linkMetric.keyName)(
              "linkDirection", (int)stats::LinkDirection::LINK_Z)));
}

} // namespace gorilla
} // namespace facebook
