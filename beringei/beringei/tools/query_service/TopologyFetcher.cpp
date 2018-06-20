/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "ApiServiceClient.h"
#include "TopologyFetcher.h"
#include "TopologyStore.h"

#include <curl/curl.h>
#include <folly/String.h>
#include <folly/io/async/AsyncTimeout.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_int32(topology_refresh_interval, 30, "Topology refresh interval");

using apache::thrift::SimpleJSONSerializer;

namespace facebook {
namespace gorilla {

TopologyFetcher::TopologyFetcher(
    std::shared_ptr<MySqlClient> mySqlClient,
    TACacheMap& typeaheadCache,
    std::shared_ptr<ApiServiceClient> apiServiceClient)
    : mySqlClient_(mySqlClient),
      typeaheadCache_(typeaheadCache),
      apiServiceClient_(apiServiceClient) {
  // refresh topology time period
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  // first run
  timerCb();
  timer_->scheduleTimeout(FLAGS_topology_refresh_interval * 1000);
}

// for each node in the topology, check if it is currently in the list of
// nodes, if it isn't, add it to the list and update the database
void TopologyFetcher::updateDbNodesTable(query::Topology& topology) {
  std::unordered_map<std::string, query::MySqlNodeData> newOrUpdatedNodes;

  // update the nodes table with retrieved information
  for (const auto& node : topology.nodes) {
    auto nodeId = mySqlClient_->getNodeId(node.mac_addr);
    query::MySqlNodeData newNode;
    if (!nodeId) {
      LOG(INFO) << "Unknown node: " << node.name;
    }
    newNode.mac = node.mac_addr;
    newNode.node = node.name;
    newNode.site = node.site_name;
    newNode.network = topology.name;
    newOrUpdatedNodes[newNode.mac] = newNode;
  }
  if (!newOrUpdatedNodes.empty()) {
    mySqlClient_->addOrUpdateNodes(newOrUpdatedNodes);
    LOG(INFO) << "Ran addOrUpdateNodes/addStatKeys, refreshing";
    mySqlClient_->refreshAll();
  }
}

void TopologyFetcher::timerCb() {
  timer_->scheduleTimeout(FLAGS_topology_refresh_interval * 1000);
  // refresh topologies from mysql
  mySqlClient_->refreshTopologies();
  auto topologyInstance = TopologyStore::getInstance();
  for (const auto& topologyMap : mySqlClient_->getTopologyConfigs()) {
    const std::shared_ptr<query::TopologyConfig> topologyConfig = topologyMap.second;
    const std::string postData = "{}";
    auto topology = apiServiceClient_->fetchApiService<query::Topology>(
        topologyConfig, postData, "api/getTopology");
    if (topology.nodes.empty()) {
      LOG(INFO) << "Empty topology for: " << topologyConfig->name;
    } else {
      topologyConfig->topology = topology;
      // TODO: we never remove old topologies - after some amount of time
      //   over which a topology was never "added" we should remove it
      //   like 1 day
      topologyInstance->addTopology(topologyConfig);
      LOG(INFO) << "Topology refreshed for: " << topology.name;
      // load stats type-ahead cache?
      updateTypeaheadCache(topology);

      // update mysql with nodes from topology
      updateDbNodesTable(topology);
    }
    // TODO: delete old topologies
  }
}

void TopologyFetcher::updateTypeaheadCache(query::Topology& topology) {
  try {
    // insert cache handler
    auto taCache = std::make_shared<StatsTypeAheadCache>(mySqlClient_);
    taCache->fetchMetricNames(topology);
    LOG(INFO) << "Type-ahead cache loaded for: " << topology.name;
    // re-insert into the map
    {
      auto locked = typeaheadCache_.wlock();
      auto taCacheIt = locked->find(topology.name);
      if (taCacheIt != locked->end()) {
        taCacheIt->second.swap(taCache);
      } else {
        locked->insert(std::make_pair(topology.name, taCache));
      }
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to update stats typeahead cache for: "
               << topology.name;
  }
}

void TopologyFetcher::start() {
  eb_.loopForever();
}

} // namespace gorilla
} // namespace facebook
