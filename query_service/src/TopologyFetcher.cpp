/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "TopologyFetcher.h"

#include "ApiServiceClient.h"
#include "MetricCache.h"
#include "MySqlClient.h"
#include "TopologyStore.h"

#include <folly/IPAddress.h>
#include <folly/String.h>
#include <folly/ThreadName.h>
#include <folly/io/async/AsyncTimeout.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_int32(topology_refresh_interval, 30, "Topology refresh interval");

using namespace facebook::terragraph;

using apache::thrift::SimpleJSONSerializer;

namespace facebook {
namespace gorilla {

TopologyFetcher::TopologyFetcher() {
  // initial timer for periodic refresh
  timer_ = folly::AsyncTimeout::make(
      eb_, [&]() noexcept { refreshTopologyCache(); });
  // wait for initial topology cache
  refreshTopologyCache();
  // run forever
  ebThread_ = std::thread([this]() {
    folly::setThreadName("Topology Fetcher");
    this->eb_.loopForever();
  });
}

TopologyFetcher::~TopologyFetcher() {
  ebThread_.join();
}

void TopologyFetcher::refreshTopologyCache() {
  timer_->scheduleTimeout(FLAGS_topology_refresh_interval * 1000);
  // refresh topologies from mysql
  auto mySqlClient = MySqlClient::getInstance();
  mySqlClient->refreshTopologies();
  // refresh nodes and keys after every topology refresh
  mySqlClient->refreshAll();
  auto topologyInstance = TopologyStore::getInstance();
  // fetch cached topologies

  for (auto topologyConfig : mySqlClient->getTopologyConfigs()) {
    auto topology = ApiServiceClient::makeRequest<thrift::Topology>(
        topologyConfig.second->primary_controller.ip,
        topologyConfig.second->primary_controller.api_port,
        "api/getTopology");
    if (!topology) {
      LOG(INFO) << "Failed to fetch topology for "
                << topologyConfig.second->name;
    } else if (topology->nodes.empty()) {
      LOG(INFO) << "Empty topology for: " << topologyConfig.second->name;
    } else {
      topologyConfig.second->topology = *topology;
      // update metric cache for network
      auto metricCache = MetricCache::getInstance();
      metricCache->updateMetricNames(*topology);
      // TODO: (pmccutcheon) T44660952 we never remove old topologies - after
      // some amount of time
      //   over which a topology was never "added" we should remove it
      //   like 1 day
      topologyInstance->addTopology(topologyConfig.second);
      LOG(INFO) << "Topology refreshed for: " << topology->name;
    }
    // TODO: delete old topologies
  }
}

} // namespace gorilla
} // namespace facebook
