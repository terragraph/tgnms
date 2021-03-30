/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "MySqlClient.h"

#include "StatsUtils.h"

#include <unistd.h>
#include <utility>

#include <folly/DynamicConverter.h>
#include <folly/MapUtil.h>
#include <folly/io/IOBuf.h>
#include <thrift/lib/cpp/protocol/TProtocolTypes.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_string(mysql_url, "localhost", "mysql host");
DEFINE_string(mysql_user, "root", "mysql user");
DEFINE_string(mysql_pass, "", "mysql password");
DEFINE_string(mysql_database, "cxl", "mysql database");

using namespace facebook::terragraph::thrift;

namespace facebook {
namespace terragraph {
namespace stats {

static folly::Singleton<MySqlClient> mysqlClientInstance_;

folly::Optional<std::unique_ptr<sql::Connection>>
MySqlClient::openConnection() noexcept {
  try {
    auto driver = sql::mysql::get_driver_instance();
    sql::ConnectOptionsMap connProps;
    connProps["hostName"] = FLAGS_mysql_url;
    connProps["userName"] = FLAGS_mysql_user;
    connProps["password"] = FLAGS_mysql_pass;
    connProps["OPT_RECONNECT"] = true;
    auto connection =
        std::unique_ptr<sql::Connection>(driver->connect(connProps));
    connection->setSchema(FLAGS_mysql_database);
    return connection;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "connect ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
  return folly::none;
}

std::shared_ptr<MySqlClient> MySqlClient::getInstance() {
  return mysqlClientInstance_.try_get();
}

void MySqlClient::refreshAll() noexcept {
  // topology fetcher is responsible for refresh node + key cache before
  // building its index
  refreshLinkMetrics();
}

std::map<int64_t, std::shared_ptr<thrift::TopologyConfig>>
MySqlClient::getTopologyConfigs() {
  return topologyIdMap_.copy();
}

LinkMetricMap MySqlClient::getLinkMetrics() {
  return linkMetrics_.copy();
}

void MySqlClient::refreshTopologies() noexcept {
  // load all topologies
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(
        "SELECT "
        "t.id, "
        "t.name, "
        "cp.api_ip AS `pip`, "
        "cp.api_port AS `papi_port`, "
        "cb.api_ip AS `bip`, "
        "cb.api_port AS `bapi_port` "
        "FROM topology t "
        "JOIN (controller cp) ON (t.primary_controller=cp.id) "
        "LEFT JOIN (controller cb) ON (t.backup_controller=cb.id)"));
    std::map<int64_t, std::shared_ptr<thrift::TopologyConfig>> topologyIdTmp;
    while (res->next()) {
      auto config = std::make_shared<thrift::TopologyConfig>();
      config->id = res->getInt("id");
      config->name = res->getString("name");
      config->primary_controller.ip = res->getString("pip");
      config->primary_controller.api_port = res->getInt("papi_port");
      const std::string backupIp = res->getString("bip");
      if (!backupIp.empty()) {
        thrift::ControllerEndpoint backupController;
        backupController.ip = backupIp;
        backupController.api_port = res->getInt("bapi_port");
        config->set_backup_controller(backupController);
      }
      // add to topology list
      topologyIdTmp[config->id] = config;
    }
    // refresh key ids for each topology
    topologyIdMap_.swap(topologyIdTmp);
    LOG(INFO) << "refreshTopologies:  " << topologyIdMap_.rlock()->size();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshTopologies ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshLinkMetrics() noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT `id`, `key_name`, `key_prefix`, `name`, "
                           "`description` FROM `link_metric`"));

    LOG(INFO) << "refreshLinkMetrics: Number of link metrics: "
              << res->rowsCount();
    // reset link metrics list
    LinkMetricMap linkMetricMapTmp{};
    while (res->next()) {
      int64_t keyId = res->getInt("id");
      std::string name = StatsUtils::toLowerCase(res->getString("name"));
      std::string keyName = StatsUtils::toLowerCase(res->getString("key_name"));
      std::string keyPrefix =
          StatsUtils::toLowerCase(res->getString("key_prefix"));
      std::string description = res->getString("description");

      // add link metric to temp map
      thrift::LinkMetric linkMetric;
      linkMetric.shortName = name;
      linkMetric.keyName = keyName;
      linkMetric.keyPrefix = keyPrefix;
      linkMetric.description = description;
      linkMetricMapTmp[name] = linkMetric;
    }
    // update link metrics map
    linkMetrics_.wlock()->swap(linkMetricMapTmp);
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshLinkMetrics ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

folly::Optional<thrift::LinkEvent> MySqlClient::getLinkEvents(
    const std::string& topologyName,
    int hoursAgo,
    int allowedDelaySec) noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return folly::none;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(
        "SELECT `id`, `linkName`, `linkDirection`, `eventType`, "
        "UNIX_TIMESTAMP(`startTs`) AS `startTs`, "
        "UNIX_TIMESTAMP(`endTs`) AS `endTs` FROM `link_event` "
        "WHERE `topologyName` = '" +
        topologyName + "'AND `endTs` > DATE_SUB(NOW(), INTERVAL " +
        std::to_string(hoursAgo) + " HOUR)"));

    thrift::LinkEvent linkEventMap{};
    while (res->next()) {
      if (res->getString("linkDirection") != "A") {
        // TODO(T69343129) - record for Z side as well
        continue;
      }
      int dbId = res->getInt("id");
      std::string linkName = res->getString("linkName");
      long startTs = res->getInt("startTs");
      long endTs = res->getInt("endTs");
      std::string eventType = res->getString("eventType");
      // add link metric to temp map
      thrift::EventDescription linkStateDescr;
      // convert from DB string enum('LINK_UP','LINK_UP_DATADOWN')
      linkStateDescr.dbId = dbId;
      linkStateDescr.linkState = eventType == "LINK_UP"
          ? thrift::LinkStateType::LINK_UP
          : thrift::LinkStateType::LINK_UP_DATADOWN;
      linkStateDescr.startTime = startTs;
      linkStateDescr.endTime = endTs;
      linkEventMap.events[linkName].events.push_back(linkStateDescr);
    }
    int curTs = StatsUtils::getTimeInSeconds();
    int windowSeconds = 60 * 60 * hoursAgo;
    int minStartTs = curTs - windowSeconds;
    linkEventMap.startTime = minStartTs;
    linkEventMap.endTime = curTs;
    // calculate link health
    for (auto& linkNameToEvents : linkEventMap.events) {
      // extend most recent event up until the end of the interval
      // if it's within the allowed delay window
      if (!linkNameToEvents.second.events.empty()) {
        auto& mostRecentEvent = linkNameToEvents.second.events.front();
        if (mostRecentEvent.linkState == thrift::LinkStateType::LINK_UP &&
            mostRecentEvent.endTime >= curTs - allowedDelaySec) {
          // extend event to cover to the end of the interval
          mostRecentEvent.endTime = curTs;
        }
      }
      int onlineSeconds = 0;
      int dataDownSeconds = 0;
      // loop over all events for this link to determine availability
      for (auto& linkEvent : linkNameToEvents.second.events) {
        // ensure time window boundaries
        if (linkEvent.startTime < minStartTs) {
          linkEvent.startTime = minStartTs;
        }
        if (linkEvent.endTime > curTs) {
          linkEvent.endTime = curTs;
        }
        int eventSeconds = linkEvent.endTime - linkEvent.startTime;
        onlineSeconds += eventSeconds;
        if (linkEvent.linkState == thrift::LinkStateType::LINK_UP_DATADOWN) {
          dataDownSeconds += eventSeconds;
        }
        linkEvent.description = StatsUtils::getDurationString(eventSeconds);
      }
      linkNameToEvents.second.linkAlive =
          onlineSeconds / (double)windowSeconds * 100.0;
      linkNameToEvents.second.linkAvailForData =
          (onlineSeconds - dataDownSeconds) / (double)windowSeconds * 100.0;
    }
    return linkEventMap;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "getLinkEvents ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
  return folly::none;
}

folly::Optional<LinkStateMap> MySqlClient::refreshLatestLinkState() noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return folly::none;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(
        "SELECT `id`, `linkName`, `linkDirection`, `eventType`, "
        "UNIX_TIMESTAMP(`startTs`) AS startTs, "
        "UNIX_TIMESTAMP(`endTs`) AS endTs FROM "
        "(SELECT `linkName` linkNameLatest, "
        "`linkDirection` linkDirLatest, "
        "MAX(`endTs`) AS max_ts "
        "FROM `link_event` "
        "GROUP BY `linkName`, `linkDirection`) "
        "AS `latest_event`"
        "INNER JOIN `link_event` "
        "ON (latest_event.max_ts=link_event.endTs) "
        "AND (latest_event.linkNameLatest=link_event.linkName)"
        "AND (latest_event.linkDirLatest=link_event.linkDirection)"));

    LOG(INFO) << "refreshLatestLinkEvents: Number of links: "
              << res->rowsCount();
    // reset link metrics list
    LinkStateMap linkStateMap{};
    while (res->next()) {
      int64_t keyId = res->getInt("id");
      std::string linkName = res->getString("linkName");
      thrift::LinkDirection linkDir = res->getString("linkDirection") == "A"
          ? thrift::LinkDirection::LINK_A
          : thrift::LinkDirection::LINK_Z;
      long startTs = res->getInt("startTs");
      long endTs = res->getInt("endTs");
      std::string eventType = res->getString("eventType");
      // add link metric to temp map
      thrift::EventDescription linkStateDescr;
      linkStateDescr.dbId = keyId;
      // convert from DB string enum('LINK_UP','LINK_UP_DATADOWN')
      linkStateDescr.linkState = eventType == "LINK_UP"
          ? thrift::LinkStateType::LINK_UP
          : thrift::LinkStateType::LINK_UP_DATADOWN;
      linkStateDescr.startTime = startTs;
      linkStateDescr.endTime = endTs;
      linkStateMap[linkName][linkDir] = linkStateDescr;
    }
    return linkStateMap;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshLatestLinkState ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
  return folly::none;
}

void MySqlClient::updateLinkState(
    const long keyId,
    const time_t endTs) noexcept {
  VLOG(2) << "updateLinkState(" << keyId << ", " << endTs << ")";
  auto stmt =
      "UPDATE `link_event` SET `endTs` = FROM_UNIXTIME(?) WHERE `id` = ?";
  auto connection = openConnection();
  if (!connection) {
    LOG(ERROR) << "Unable to open MySQL connection.";
    return;
  }
  try {
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        (*connection)->prepareStatement(std::move(stmt)));
    prep_stmt->setInt(1, endTs);
    prep_stmt->setInt(2, keyId);
    prep_stmt->execute();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "updateLinkState ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::addLinkState(
    const std::string& topologyName,
    const std::string& linkName,
    const thrift::LinkDirection& linkDir,
    const thrift::LinkStateType& linkState,
    const time_t startTs,
    const time_t endTs) noexcept {
  auto stmt =
      "INSERT INTO `link_event` "
      "(`topologyName`, `linkName`, `linkDirection`, `eventType`, `startTs`, "
      "`endTs`) VALUES (?, ?, ?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))";
  VLOG(2) << "addLinkState(" << topologyName << ", " << linkName << ", "
          << (linkDir == thrift::LinkDirection::LINK_A ? "A" : "Z") << ", "
          << folly::get_default(
                 thrift::_LinkStateType_VALUES_TO_NAMES, linkState, "UNKNOWN")
          << ", " << startTs << ", " << endTs << ")";
  auto connection = openConnection();
  if (!connection) {
    LOG(ERROR) << "Unable to open MySQL connection.";
    return;
  }
  try {
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        (*connection)->prepareStatement(std::move(stmt)));
    prep_stmt->setString(1, topologyName);
    prep_stmt->setString(2, linkName);
    prep_stmt->setString(
        3, (linkDir == thrift::LinkDirection::LINK_A ? "A" : "Z"));
    // get string name for link state
    prep_stmt->setString(
        4, thrift::_LinkStateType_VALUES_TO_NAMES.at(linkState));
    prep_stmt->setInt(5, startTs);
    prep_stmt->setInt(6, endTs);
    prep_stmt->execute();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "addLinkState ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
