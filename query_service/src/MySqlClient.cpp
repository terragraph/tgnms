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
static std::unordered_map<int, std::string> ScanTypeMap = {
    {(int)ScanType::RTCAL, "RTCAL"},
    {(int)ScanType::PBF, "PBF"},
    {(int)ScanType::IM, "IM"},
    {(int)ScanType::CBF_TX, "CBF_TX"},
    {(int)ScanType::CBF_RX, "CBF_RX"},
    {(int)ScanType::TOPO, "TOPO"},
};

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
        "cb.api_port AS `bapi_port`, "
        "wc.type AS `wac_type`, "
        "wc.url AS `wac_url`, "
        "wc.username AS `wac_username`, "
        "wc.password AS `wac_password` "
        "FROM topology t "
        "JOIN (controller cp) ON (t.primary_controller=cp.id) "
        "LEFT JOIN (controller cb) ON (t.backup_controller=cb.id) "
        "LEFT JOIN (wireless_controller wc) ON (t.wireless_controller=wc.id)"));
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
      const std::string wacType = res->getString("wac_type");
      if (!wacType.empty()) {
        thrift::WirelessController wirelessController;
        wirelessController.type = wacType;
        wirelessController.url = res->getString("wac_url");
        wirelessController.username = res->getString("wac_username");
        wirelessController.password = res->getString("wac_password");
        config->set_wireless_controller(wirelessController);
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

// reads the latest BWGD for a given network
// Unix time can be derived from the BWGD
int64_t MySqlClient::getLastBwgd(const std::string& network) noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return MySqlError;
    }

    // normally, the last BWGD and last entry will be the same, but it's
    // possible that the last entry BWGD is earlier than previous entries
    // that is why we order by id and not by start_bwgd
    std::string query =
        "SELECT start_bwgd FROM tx_scan_results WHERE network='" + network +
        "' ORDER BY id DESC LIMIT 1";

    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(std::move(query)));
    if (res->next()) {
      return res->getInt64("start_bwgd");
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "ERROR reading last inserted ID: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
  return MySqlError;
}

int64_t MySqlClient::getLastId(
    const int token,
    const int64_t startBwgd,
    const std::string& network) noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return MySqlError;
    }
    std::string query =
        "SELECT id FROM tx_scan_results WHERE token=" + std::to_string(token) +
        " AND start_bwgd=" + std::to_string(startBwgd) + " AND network='" +
        network + "'";
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(std::move(query)));
    if (res->next()) {
      return res->getInt64("id");
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "ERROR reading last inserted ID: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
  return MySqlError;
}

// there are two mySQL tables for scan responses - tx and rx
// each row of the table is a single scan response from a node
// to retrieve scan results, the tables are JOINed by token/network/bwgd
int MySqlClient::writeTxScanResponse(
    const thrift::MySqlScanTxResp& scanResponse,
    sql::Connection* connection) noexcept {
  try {
    std::string query =
        "INSERT INTO `tx_scan_results` "
        "(`token`, `combined_status`, `tx_node_id`, `start_bwgd`, "
        "`scan_type`, `network`,`scan_sub_type`, `scan_mode`, "
        "`apply_flag`, `status`, `tx_power`, `resp_id`, `tx_node_name`, "
        "`scan_resp`, `n_responses_waiting`, `group_id`) VALUES "
        "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection->prepareStatement(std::move(query)));
    prep_stmt->setInt(1, scanResponse.token);
    prep_stmt->setInt(2, scanResponse.combinedStatus);
    prep_stmt->setInt(3, scanResponse.txNodeId);
    prep_stmt->setUInt64(4, scanResponse.startBwgd);
    prep_stmt->setInt(5, scanResponse.scanType);
    prep_stmt->setString(6, scanResponse.network);
    prep_stmt->setInt(7, scanResponse.scanSubType);
    prep_stmt->setInt(8, scanResponse.scanMode);
    prep_stmt->setInt(9, scanResponse.applyFlag);
    prep_stmt->setInt(10, (int32_t)scanResponse.status);
    prep_stmt->setInt(11, scanResponse.txPower);
    prep_stmt->setInt(12, scanResponse.respId);
    prep_stmt->setString(13, scanResponse.txNodeName);
    // If we did not receive a real tx response from this scan (as signified
    // by a NO_TX_RESPONSE status), set the scan response to null
    if (scanResponse.scanResp.empty()) {
      // tracking ASAN failure new-delete-mismatch
      // prep_stmt->setNull(14, 0); // scanResp
    } else {
      prep_stmt->setString(14, scanResponse.scanResp);
    }
    prep_stmt->setInt(15, *scanResponse.nResponsesWaiting_ref());
    prep_stmt->setInt(16, *scanResponse.groupId_ref());

    prep_stmt->execute();
    return MySqlOk;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "Tx scan response ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
    return e.getErrorCode();
  }
}

bool MySqlClient::writeRxScanResponse(
    const thrift::MySqlScanRxResp& scanResponse,
    const int64_t txId,
    sql::Connection* connection) noexcept {
  try {
    std::string query =
        "INSERT INTO `rx_scan_results` "
        "(`status`, `scan_resp`, `rx_node_id`, `tx_id`, `rx_node_name`, "
        "`new_beam_flag`) VALUES (?, ?, ?, ?, ?, ?)";
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection->prepareStatement(std::move(query)));
    prep_stmt->setInt(1, (int32_t)scanResponse.status);
    // If rx scan reponse is empty, no route info was given. Signify this by
    // setting scanResp to NULL
    if (scanResponse.scanResp.empty()) {
      prep_stmt->setNull(2, 0); // scanResp
    } else {
      prep_stmt->setString(2, scanResponse.scanResp);
    }
    prep_stmt->setInt(3, scanResponse.rxNodeId);
    prep_stmt->setUInt64(4, txId);
    prep_stmt->setString(5, scanResponse.rxNodeName);
    prep_stmt->setInt(6, scanResponse.newBeamFlag);
    prep_stmt->execute();
    return true;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "Rx scan response ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
    return false;
  }
}

bool MySqlClient::writeScanResponses(
    const std::vector<thrift::MySqlScanResp>& mySqlScanResponses) noexcept {
  int numScansWritten = 0;
  auto connection = openConnection();
  if (!connection) {
    LOG(ERROR) << "Unable to open MySQL connection.";
    return false;
  }
  for (const auto& mySqlScanResponse : mySqlScanResponses) {
    int errCode;
    try {
      LOG(INFO) << "Writing "
                << ScanTypeMap.at(mySqlScanResponse.txResponse.scanType)
                << " scans to DB, respId: "
                << mySqlScanResponse.txResponse.respId << "; "
                << mySqlScanResponse.rxResponses.size() << " rx responses";
    } catch (const std::out_of_range& oor) {
      LOG(ERROR) << "Invalid scan type: " << oor.what();
    }
    if ((errCode = writeTxScanResponse(
             mySqlScanResponse.txResponse, connection->get())) == MySqlOk) {
      numScansWritten++;
      int64_t tx_id = getLastId(
          mySqlScanResponse.txResponse.token,
          mySqlScanResponse.txResponse.startBwgd,
          mySqlScanResponse.txResponse.network);
      if (tx_id != MySqlError) {
        for (const auto& rxResponse : mySqlScanResponse.rxResponses) {
          if (!writeRxScanResponse(rxResponse, tx_id, connection->get())) {
            return false;
          }
        }
      } else {
        return false;
      }
    } else if (errCode != MySqlDuplicateEntry) {
      // if the error is something other than duplicate entry,
      // something is wrong
      return false;
    }
  }
  LOG(INFO) << "Successfully wrote " << numScansWritten << " scans";
  return true;
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
