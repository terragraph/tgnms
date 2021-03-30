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
#include <folly/Optional.h>
#include <folly/Singleton.h>
#include <folly/Synchronized.h>
#include <folly/futures/Future.h>

#include "if/gen-cpp2/Controller_types_custom_protocol.h"
#include "if/gen-cpp2/QueryService_types_custom_protocol.h"
#include "if/gen-cpp2/Stats_types_custom_protocol.h"
#include "if/gen-cpp2/Topology_types_custom_protocol.h"

#include "mysql_connection.h"
#include "mysql_driver.h"

#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/prepared_statement.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>

namespace facebook {
namespace terragraph {
namespace stats {

typedef std::unordered_map<int64_t, std::unordered_map<std::string, int64_t>>
    NodeKeyMap;
typedef std::unordered_map<int64_t, std::unordered_map<std::string, int64_t>>
    NodeCategoryMap;
typedef std::unordered_map<std::string /* metric name */, thrift::LinkMetric>
    LinkMetricMap;
typedef std::unordered_map<
    std::string /* link name */,
    std::unordered_map<thrift::LinkDirection, thrift::EventDescription>>
    LinkStateMap;

class MySqlClient {
 public:
  enum mySqlErrorCode {
    MySqlOk = 0,
    MySqlError = -1,
    MySqlDuplicateEntry = 1062
  };
  explicit MySqlClient(){};

  folly::Optional<std::unique_ptr<sql::Connection>> openConnection() noexcept;

  static std::shared_ptr<MySqlClient> getInstance();

  void refreshAll() noexcept;

  std::map<int64_t, std::shared_ptr<thrift::TopologyConfig>>
  getTopologyConfigs();

  LinkMetricMap getLinkMetrics();

  void refreshTopologies() noexcept;

  void refreshLinkMetrics() noexcept;

  // link health state
  folly::Optional<thrift::LinkEvent> getLinkEvents(
      const std::string& topologyName,
      int hoursAgo,
      int allowedDelaySec) noexcept;
  folly::Optional<LinkStateMap> refreshLatestLinkState() noexcept;
  void updateLinkState(const long keyId, const time_t endTs) noexcept;
  void addLinkState(
      const std::string& topologyName,
      const std::string& linkName,
      const thrift::LinkDirection& linkDir,
      const thrift::LinkStateType& linkState,
      const time_t startTs,
      const time_t endTs) noexcept;

 private:
  folly::Synchronized<std::map<int64_t, std::shared_ptr<thrift::TopologyConfig>>>
      topologyIdMap_{};
  folly::Synchronized<LinkMetricMap> linkMetrics_{};
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
