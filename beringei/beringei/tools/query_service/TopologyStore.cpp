/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "TopologyStore.h"

namespace facebook {
namespace gorilla {

static folly::Singleton<TopologyStore> storeInstance_;

std::shared_ptr<TopologyStore> TopologyStore::getInstance() {
  return storeInstance_.try_get();
}

std::shared_ptr<query::TopologyConfig> TopologyStore::getTopology(
    const std::string& name) {
  auto it = topologyConfigs_.find(name);
  if (it != topologyConfigs_.end()) {
    return it->second;
  }
  throw std::invalid_argument("No topology named: " + name);
}

std::unordered_map<std::string, std::shared_ptr<query::TopologyConfig>>
TopologyStore::getTopologyList() {
  return topologyConfigs_;
}

void TopologyStore::addTopology(
    std::shared_ptr<query::TopologyConfig> topologyConfig) {
  topologyConfigs_[topologyConfig->name] = topologyConfig;
}

void TopologyStore::delTopology(const std::string& name) {
  topologyConfigs_.erase(name);
}

} // namespace gorilla
} // namespace facebook
