/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <folly/Singleton.h>
#include <folly/Synchronized.h>

#include "if/gen-cpp2/QueryService_types_custom_protocol.h"

namespace facebook {
namespace terragraph {
namespace stats {

class TopologyStore {
 public:
  explicit TopologyStore(){};

  static std::shared_ptr<TopologyStore> getInstance();

  std::shared_ptr<thrift::TopologyConfig> getTopology(const std::string& name);

  std::unordered_map<std::string, std::shared_ptr<thrift::TopologyConfig>>
  getTopologyList();

  void addTopology(std::shared_ptr<thrift::TopologyConfig> topologyConfig);
  void delTopology(const std::string& name);

 private:
  folly::Synchronized<std::unordered_map<
      std::string /* topology name */,
      std::shared_ptr<thrift::TopologyConfig>>>
      topologyConfigs_{};
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
