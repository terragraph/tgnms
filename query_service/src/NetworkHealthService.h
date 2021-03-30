/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "MySqlClient.h"
#include "NetworkHealthUtils.h"

#include <folly/Synchronized.h>
#include <folly/io/async/EventBaseManager.h>

#include "if/gen-cpp2/Stats_types_custom_protocol.h"

namespace facebook {
namespace terragraph {
namespace stats {

class NetworkHealthService {
 public:
  explicit NetworkHealthService(const std::string& brokerEndpointList);
  virtual ~NetworkHealthService();

 private:
  std::string brokerEndpointList_;
  std::thread consumeThread_;
  std::unordered_map<
      std::string /* topology name */,
      std::unordered_map<std::string /* link name */, LinkStatsByDirection>>
          linkHealthStats_;

  // keep track of latest DB state so we know when we need to update
  std::unordered_map<std::string /* link name */, thrift::LinkStateType>
      linkHealthState_;
  std::unordered_set<std::string> healthKeys_;

  // perform all periodic work
  void consume(const std::string& topicName);
  void linkHealthUpdater();
  void publishLinkAvailability();
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
