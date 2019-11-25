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
#include "StatsUtils.h"
#include "TopologyStore.h"

#include <folly/MacAddress.h>
#include <folly/Optional.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <iostream>
#include <regex>

using namespace facebook::terragraph;

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

folly::Optional<std::pair<std::string, thrift::Node>>
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

void MetricCache::updateMetricNames(const thrift::Topology& request) {
  std::map<std::string /* node name */, thrift::Node> nodesByName;
  if (request.nodes.empty()) {
    LOG(ERROR) << "No nodes in topology, failing request";
    return;
  }
  for (auto& node : request.nodes) {
    // no stats if no mac address defined
    if (node.mac_addr.empty()) {
      continue;
    }
    auto macAddr = StatsUtils::toLowerCase(node.mac_addr);
    // index mac -> node
    {
      auto nodeByMacLock = nodeByMac_.wlock();
      // record the topology name + node struct
      VLOG(2) << "Adding node mac: " << macAddr;
      (*nodeByMacLock)[macAddr] = std::make_pair(request.name, node);
    }
    if (!node.wlan_mac_addrs.empty()) {
      // index each radio mac
      {
        auto nodeByMacLock = nodeByMac_.wlock();
        for (const auto& radioMacAddr : node.wlan_mac_addrs) {
          std::string radioMacAddrLC = StatsUtils::toLowerCase(radioMacAddr);
          // record the topology name + node struct
          if (!(*nodeByMacLock).count(radioMacAddrLC)) {
            VLOG(2) << "Adding radio mac: " << radioMacAddrLC << " for "
                    << node.mac_addr;
            (*nodeByMacLock)[radioMacAddrLC] =
                std::make_pair(request.name, node);
          }
        }
      }
    }
    nodesByName[node.name] = node;
  }
  auto mySqlClient = MySqlClient::getInstance();
  LinkMetricMap allLinkMetrics = mySqlClient->getLinkMetrics();
  {
    auto nodeKeyLookupLock = nodeMacToKeyList_.wlock();
    for (auto& link : request.links) {
      VLOG(3) << "Link: " << link.name;
      // skip wired links
      if (link.link_type != thrift::LinkType::WIRELESS) {
        continue;
      }
      auto aNode = nodesByName[link.a_node_name];
      auto zNode = nodesByName[link.z_node_name];
      for (const auto& linkMetric : allLinkMetrics) {
        folly::Optional<NodeLinkMetrics> linkMetrics =
            createLinkMetric(link, linkMetric.second);
        if (!linkMetrics) {
          continue;
        }
        for (auto& key : linkMetrics.value().keys) {
          auto radioMac = StatsUtils::toLowerCase(key.radioMac);
          auto keyName = StatsUtils::toLowerCase(key.keyName);
          // short name should already be tagged
          VLOG(2) << "Adding key mapping " << keyName << " -> "
                  << linkMetric.first << " for radio mac: " << radioMac;
          stats::KeyMetaData& keyData = (*nodeKeyLookupLock)[radioMac][keyName];
          // push key data for link metric
          keyData.topologyName = request.name;
          keyData.linkName = link.name;
          keyData.shortName = linkMetric.first;
          keyData.linkDirection = key.linkDirection;
          // copy to short key name for lookups
          (*nodeKeyLookupLock)[radioMac][linkMetric.first] = keyData;
          VLOG(3) << "\tLoaded key: [" << radioMac << "][" << keyData.shortName
                  << "]";
        }
      }
    }
  }
}

// TODO - convert this to thrift struct
folly::Optional<NodeLinkMetrics> MetricCache::createLinkMetric(
    const thrift::Link& link,
    const stats::LinkMetric& linkMetric) {
  // link should always have a_node_mac + z_node_mac
  if (link.a_node_mac.empty() || link.z_node_mac.empty()) {
    VLOG(1) << "Empty MAC for link " << link.name;
    return folly::none;
  }
  NodeLinkMetrics nodeLinkMetrics(linkMetric.shortName, linkMetric.description);
  // a-side
  std::string keyNameLinkA = folly::sformat(
      "{}.{}.{}", linkMetric.keyPrefix, link.z_node_mac, linkMetric.keyName);
  NodeLinkMetricKey keyLinkA(
      link.a_node_mac, keyNameLinkA, stats::LinkDirection::LINK_A);

  // z-side
  std::string keyNameLinkZ = folly::sformat(
      "{}.{}.{}", linkMetric.keyPrefix, link.a_node_mac, linkMetric.keyName);
  NodeLinkMetricKey keyLinkZ(
      link.z_node_mac, keyNameLinkZ, stats::LinkDirection::LINK_Z);
  nodeLinkMetrics.keys = {keyLinkA, keyLinkZ};
  return nodeLinkMetrics;
}

} // namespace gorilla
} // namespace facebook
