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
#include "PrometheusUtils.h"

#include <folly/Synchronized.h>
#include <folly/io/async/EventBaseManager.h>

#include "beringei/if/gen-cpp2/Stats_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class NetworkHealthService {
 public:
  explicit NetworkHealthService(const std::string& brokerEndpointList);
  virtual ~NetworkHealthService();

 private:
  std::string brokerEndpointList_;
  std::thread consumeThread_;
  std::unordered_map<
      std::string /* topology name */,
      std::unordered_map<
          std::string /* link name */,
          std::unordered_map<
              std::string /* short name */,
              std::unordered_map<
                  stats::LinkDirection,
                  std::map<time_t /* ts */, double /* value */>>>>>
      linkHealthStats_;

  // keep track of latest DB state so we know when we need to update
  std::unordered_map<std::string /* link name */, stats::LinkStateType>
      linkHealthState_;
  std::unordered_set<std::string> healthKeys_;

  // perform all periodic work
  void consume(const std::string& topicName);
  void linkHealthUpdater();
  bool markLinkOnline(
      const std::string& topologyName,
      const std::string& linkName,
      const stats::LinkDirection& linkDir,
      const LinkStateMap& linkStateMap,
      const stats::LinkStateType& linkState,
      const long counterValue,
      const time_t startTs,
      const time_t endTs) noexcept;
  void processFwUptimeHealth(
      const std::string& topologyName,
      const std::string& linkName,
      const stats::LinkDirection& linkDirection,
      std::map<time_t /* ts */, double /* value */>& fwUptimeDatapoints,
      const LinkStateMap& linkState);
};
} // namespace gorilla
} // namespace facebook
