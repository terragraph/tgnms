/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "StatsTypeAheadCache.h"

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
StatsTypeAheadCache::StatsTypeAheadCache() { }

folly::Optional<stats::KeyMetaData> StatsTypeAheadCache::getKeyDataByNodeKey(
    const std::string& nodeMac,
    const std::string& keyName) const {
  auto nodeIt = nodeMacToKeyList_.find(nodeMac);
  if (nodeIt != nodeMacToKeyList_.end()) {
    auto keyDataIt = nodeIt->second.find(keyName);
    if (keyDataIt != nodeIt->second.end()) {
      return *keyDataIt->second;
    }
  }
  return folly::none;
}

std::vector<stats::KeyMetaData> StatsTypeAheadCache::getKeyData(
    const std::string& metricName) const {
  std::vector<stats::KeyMetaData> retKeyData;
  // return KeyData based on a metric name
  auto metricId = keyToMetricIds_.find(metricName);
  auto shortMetricId = nameToMetricIds_.find(metricName);
  if (shortMetricId != nameToMetricIds_.end()) {
    for (const auto& keyId : shortMetricId->second) {
      // metric ids
      auto keyDataIt = metricIdMetadata_.find(keyId);
      if (keyDataIt == metricIdMetadata_.end()) {
        continue;
      }
      // add KeyData
      retKeyData.push_back(*keyDataIt->second);
    }
  }
  if (metricId != keyToMetricIds_.end()) {
    for (const auto& keyId : metricId->second) {
      // metric ids
      auto keyDataIt = metricIdMetadata_.find(keyId);
      if (keyDataIt == metricIdMetadata_.end()) {
        continue;
      }
      // add KeyData
      retKeyData.push_back(*keyDataIt->second);
    }
  }
  return retKeyData;
}

void StatsTypeAheadCache::fetchMetricNames(query::Topology& request) {
  folly::dynamic nodeData;

  if (request.nodes.empty()) {
    LOG(ERROR) << "No nodes in topology, failing request";
    return;
  }

  for (auto& node : request.nodes) {
    // no stats if no mac address defined
    if (node.mac_addr.empty()) {
      continue;
    }
    macNodes_.insert(node.mac_addr);
    nodesByName_[node.name] = node;
  }
  auto mySqlClient = MySqlClient::getInstance();
  auto dbNodes = mySqlClient->getNodesWithKeys(macNodes_);
  for (const auto& node : dbNodes) {
    for (const auto& key : node->keyList) {
      folly::StringPiece keyName = folly::StringPiece(key.second);
      if (keyName.endsWith("count.0") || keyName.endsWith("count.600") ||
          keyName.endsWith("count.3600") || keyName.endsWith("count.60") ||
          keyName.endsWith("avg.60") || keyName.endsWith("sum.0")) {
        continue;
      }
      // create KeyMetaData for each metric
      auto keyData = std::make_shared<stats::KeyMetaData>();
      keyData->keyId = key.first;
      keyData->keyName = key.second;
      keyData->srcNodeMac = node->mac;
      keyData->srcNodeName = node->node;
      // update units
      if (keyName.endsWith("_bytes")) {
        keyData->unit = stats::KeyUnit::BYTES_PER_SEC;
      }
      metricIdMetadata_[key.first] = keyData;
      // index the key name to its db id
      keyToMetricIds_[key.second].push_back(key.first);
      nodeMacToKeyList_[node->mac][key.second] = keyData;
    }
  }
  for (const auto& topologyConfig : mySqlClient->getTopologyConfigs()) {
    if (topologyConfig.second->name != request.name) {
      continue;
    }
    for (const auto& key : topologyConfig.second->keys) {
      auto keyData = std::make_shared<stats::KeyMetaData>();
      keyData->keyId = key.second;
      keyData->keyName = key.first;
      if (metricIdMetadata_.count(key.second) ||
          keyToMetricIds_.count(key.first)) {
        LOG(ERROR) << "Ignoring duplicate aggregate metric. Id=" << key.second
                   << ", Key=" << key.first;
        continue;
      }
      metricIdMetadata_[key.second] = keyData;
      keyToMetricIds_[key.first].push_back(key.second);
    }
  }
  LinkMetricMap allLinkMetrics = mySqlClient->getLinkMetrics();
  for (auto& link : request.links) {
    // skip wired links
    if (link.link_type != query::LinkType::WIRELESS) {
      continue;
    }
    auto aNode = nodesByName_[link.a_node_name];
    auto zNode = nodesByName_[link.z_node_name];
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
        if (!nodeMacToKeyList_.count(mac) ||
            !nodeMacToKeyList_[mac].count(keyName)) {
          VLOG(3) << "Unable to find metricName for " << aNode.name << "-"
                  << zNode.name << ", mac: " << mac << ", key: " << keyName;
          continue;
        }
        auto keyData = nodeMacToKeyList_[mac][keyName];
        // insert key / short name references
        nameToMetricIds_[linkMetric.first].push_back(keyData->keyId);
        // push key data for link metric
        keyData->linkName = link.name;
        keyData->shortName = linkMetric.first;
        keyData->linkDirection =
            (stats::LinkDirection)(key["linkDirection"].asInt());
        // update the unit
        if (key.count("unit")) {
          stats::KeyUnit unit = (stats::KeyUnit)(key["unit"].asInt());
          keyData->unit = unit;
        }
      }
    }
  }
}

folly::dynamic StatsTypeAheadCache::createLinkMetric(
    const query::Node& aNode,
    const query::Node& zNode,
    const stats::LinkMetric& linkMetric) {

  if (aNode.mac_addr.empty() || zNode.mac_addr.empty()) {
    VLOG(1) << "Empty MAC for link " << aNode.name << " <-> " << zNode.name;
    return folly::dynamic::object();
  }
  return folly::dynamic::object("title", linkMetric.shortName)(
      "description", linkMetric.description)(
      "scale", NULL)(
      "keys",
      folly::dynamic::array(
          folly::dynamic::object(
              "node", SimpleJSONSerializer::serialize<std::string>(aNode))(
              "keyName", linkMetric.keyPrefix + "." + zNode.mac_addr + "." +
                         linkMetric.keyName)(
              "linkDirection", (int)stats::LinkDirection::LINK_A),
          folly::dynamic::object(
              "node", SimpleJSONSerializer::serialize<std::string>(zNode))(
              "keyName", linkMetric.keyPrefix + "." + aNode.mac_addr + "." +
                         linkMetric.keyName)(
              "linkDirection", (int)stats::LinkDirection::LINK_Z)));
}

// type-ahead search
std::vector<std::vector<stats::KeyMetaData>> StatsTypeAheadCache::searchMetrics(
    const std::string& metricName,
    stats::TypeaheadRequest& request,
    const int limit) {
  // prepare for restrictor search
  // create a set of node MAC addresses and link names
  std::unordered_set<std::string> restrictorList({});
  for (const auto& restrictor : request.restrictors) {
    for (auto& value : restrictor.values) {
      if (restrictor.restrictorType == stats::RestrictorType::NODE) {
        auto macAddr = nodeNameToMac(value);
        if (macAddr) {
          restrictorList.emplace(*macAddr);
        }
      } else if (!value.empty()) {
        restrictorList.emplace(value);
      }
    }
  }

  VLOG(1) << "There are " << restrictorList.size() << " restrictors.";
  VLOG(1) << "Search for " << metricName << " with limit " << limit;
  std::vector<std::vector<stats::KeyMetaData>> retMetrics{};
  std::regex metricRegex;
  try {
    metricRegex = std::regex(metricName, std::regex::icase);
  } catch (const std::regex_error& ex) {
    LOG(ERROR) << "Invalid regexp: " << metricName;
    return retMetrics;
  }
  std::set<int> usedShortMetricIds;
  int retMetricId = 0;
  // search short-name metrics
  // nameToMetricIds_[shortName] = [keyId1, keyId2, ... ]
  VLOG(1) << "Found " << nameToMetricIds_.size()
          << " metric names to search through.";
  for (const auto& metric : nameToMetricIds_) {
    std::smatch metricMatch;
    if (std::regex_search(metric.first, metricMatch, metricRegex)) {
      std::vector<stats::KeyMetaData> metricKeyList;
      // insert keydata
      VLOG(1) << "\tFound metric match " << metric.first << " with "
              << metric.second.size() << " keys.";
      for (const auto& keyId : metric.second) {
        auto metricIt = metricIdMetadata_.find(keyId);
        if (metricIt != metricIdMetadata_.end() &&
            (restrictorList.empty() ||
             restrictorList.count(metricIt->second->srcNodeMac) ||
             restrictorList.count(metricIt->second->linkName))) {
          metricKeyList.push_back(*metricIt->second);
          usedShortMetricIds.insert(keyId);
        }
        if (retMetrics.size() >= limit) {
          VLOG(1) << "(Limit reached) Returning " << retMetrics.size()
                  << " metrics for " << metricName << " query.";
          return retMetrics;
        }
      }
      retMetrics.push_back(metricKeyList);
    }
  }
  VLOG(1) << "Found " << retMetrics.size() << " after metric name search.";
  VLOG(1) << "Found " << keyToMetricIds_.size() << " keys to search through.";
  // keyToMetricIds_[keyName] = [keyId1, keyId2, ... ]
  for (const auto& metric : keyToMetricIds_) {
    std::smatch metricMatch;
    if (std::regex_search(metric.first, metricMatch, metricRegex)) {
      std::vector<stats::KeyMetaData> metricKeyList;
      // insert keydata
      VLOG(1) << "\tFound key match " << metric.first << " with "
              << metric.second.size() << " keys.";
      for (const auto& keyId : metric.second) {
        auto metricIt = metricIdMetadata_.find(keyId);
        // Skip metric name if used by a short/alias key or if the source
        // node does not match restrictors
        if (metricIt != metricIdMetadata_.end() &&
            !usedShortMetricIds.count(keyId) &&
            (restrictorList.empty() ||
             restrictorList.count(metricIt->second->srcNodeMac) ||
             restrictorList.count(metricIt->second->linkName))) {
          metricKeyList.push_back(*metricIt->second);
        }
        if (retMetrics.size() >= limit) {
          VLOG(1) << "(Limit reached) Returning " << retMetrics.size()
                  << " metrics for " << metricName << " query.";
          return retMetrics;
        }
      }
      if (metricKeyList.size() > 0) {
        retMetrics.push_back(metricKeyList);
      }
    }
  }
  VLOG(1) << "Returning " << retMetrics.size() << " metrics for " << metricName
          << " query.";
  return retMetrics;
}

// retrieve list of nodes -- MAC address and node name for the current topology
folly::dynamic StatsTypeAheadCache::listNodes() {
  folly::dynamic retNodes = folly::dynamic::array;
  for (const auto& it : nodesByName_) {
    retNodes.push_back(folly::dynamic::object("srcNodeMac", it.second.mac_addr)(
        "srcNodeName", it.first));
  }
  return retNodes;
}

// input can be a node name or a MAC address; if it's a MAC address
// return the MAC address (lower case), otherwise return the MAC
// address corresponding to the input node name
folly::Optional<std::string> StatsTypeAheadCache::nodeNameToMac(
    const std::string& nameOrMacAddr) {
  if (!nameOrMacAddr.empty()) {
    try {
      // MacAddress returns the MAC address with lower case
      folly::Optional<std::string> macAddrLower =
          folly::MacAddress(nameOrMacAddr).toString();
      VLOG(1) << "Input " << *macAddrLower << " is a MAC address";
      return macAddrLower;
    } catch (const std::exception& ex) {
      // name is not a MAC address, assume it is a node name
      auto it = nodesByName_.find(nameOrMacAddr);
      if (it != nodesByName_.end()) {
        folly::Optional<std::string> macAddrLower =
            folly::MacAddress(it->second.mac_addr).toString();
        VLOG(1) << "Found MAC " << *macAddrLower << " for node name "
                << nameOrMacAddr;
        return macAddrLower;
      }
    }
  }
  VLOG(1) << "Did not find a MAC addr match for " << nameOrMacAddr;
  return folly::none;
}

// input can be a MAC address or a node name; if it's a MAC address
// return the corresponding node name; otherwise return the input
folly::Optional<std::string> StatsTypeAheadCache::macToNodeName(
    const std::string& nameOrMacAddr) {
  folly::Optional<std::string> nodeName;
  if (!nameOrMacAddr.empty()) {
    try {
      // MacAddress returns the MAC address with lower case
      const std::string& macAddrLower =
          folly::MacAddress(nameOrMacAddr).toString();
      const auto itmac = nodeMacToKeyList_.find(macAddrLower);
      if (itmac != nodeMacToKeyList_.end()) {
        // use the first key in the list, all keys have the same node name
        const auto itkey = itmac->second.begin();
        if (itkey != itmac->second.end()) {
          const auto kmd = itkey->second;
          nodeName = kmd->srcNodeName;
          VLOG(1) << "Found node name " << *nodeName << " for MAC address "
                  << macAddrLower;
        }
      }
    } catch (const std::exception& ex) {
      nodeName = nameOrMacAddr;
      VLOG(1) << "Input " << nameOrMacAddr << " is not a MAC address";
    }
  }
  if (!nodeName) {
    VLOG(1) << "Did not find a node match for " << nameOrMacAddr;
  }
  return nodeName;
}

std::shared_ptr<query::Topology> StatsTypeAheadCache::topologyNameToInstance(
    std::string topologyName) {
  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();
  auto topology = std::make_shared<query::Topology>();
  for (const auto& topologyConfig : topologyList) {
    if (topologyConfig.first == topologyName) {
      topology =
          std::make_shared<query::Topology>(topologyConfig.second->topology);
      break;
    }
  }
  return topology;
}

// retrieve list of nodes wirelessly linked to nodeA for the specified
// nodeAstr can be either the node name or MAC address
folly::dynamic StatsTypeAheadCache::listNodes(
    const std::string& nodeAstr,
    const std::string& topologyName) {
  auto topology = topologyNameToInstance(topologyName);

  if (topology == NULL) {
    LOG(ERROR) << "topology " << topologyName << " not found";
    return folly::dynamic::object();
  }
  // find node name corresponding to the input MAC address
  auto nodeA_name = macToNodeName(nodeAstr);

  if (!nodeA_name) {
    return folly::dynamic::object();
  }

  // get all linked mac_addrs from nodeA
  folly::dynamic node_z_macs = folly::dynamic::array;
  for (const auto& link : topology->links) {
    std::string matchingName;
    if (link.link_type == query::LinkType::WIRELESS) {
      if (link.a_node_name == *nodeA_name) {
        matchingName = link.z_node_name;
      } else if (link.z_node_name == *nodeA_name) {
        matchingName = link.a_node_name;
      } else {
        continue;
      }
    } else {
      continue; // consider only WIRELESS links
    }

    for (const auto& node : topology->nodes) {
      if (node.name == matchingName) {
        node_z_macs.push_back(
            folly::dynamic::object("srcNodeMac", node.mac_addr)(
                "srcNodeName", node.name)("topologyName", topologyName));
      }
    }
  }
  return node_z_macs;
} // namespace gorilla

} // namespace gorilla
} // namespace facebook
