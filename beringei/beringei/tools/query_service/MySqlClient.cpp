/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "MySqlClient.h"

#include <unistd.h>
#include <utility>

#include <folly/DynamicConverter.h>
#include <folly/MapUtil.h>
#include <folly/io/IOBuf.h>
#include <thrift/lib/cpp/protocol/TProtocolTypes.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_string(mysql_url, "localhost", "mysql host");
DEFINE_string(mysql_user, "root", "mysql user");
DEFINE_string(mysql_pass, "", "mysql password");
DEFINE_string(mysql_database, "cxl", "mysql database");

using namespace facebook::terragraph::thrift;

namespace facebook {
namespace gorilla {

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
  refreshNodes();
  refreshStatKeys();
}

std::vector<std::shared_ptr<query::MySqlNodeData>> MySqlClient::getNodes() {
  std::vector<std::shared_ptr<query::MySqlNodeData>> nodes{};
  {
    auto macAddrToNode = macAddrToNode_.rlock();
    for (auto& it : *macAddrToNode) {
      nodes.push_back(it.second);
    }
  }
  return nodes;
}

std::vector<std::shared_ptr<query::MySqlNodeData>>
MySqlClient::getNodesWithKeys() {
  return nodes_.copy();
}

std::vector<std::shared_ptr<query::MySqlNodeData>> MySqlClient::getNodes(
    const std::unordered_set<std::string>& nodeMacs) {
  std::vector<std::shared_ptr<query::MySqlNodeData>> nodes{};
  {
    auto macAddrToNode = macAddrToNode_.rlock();
    for (const auto& mac : nodeMacs) {
      auto it = macAddrToNode->find(mac);
      if (it != macAddrToNode->end()) {
        nodes.push_back(it->second);
      }
    }
  }
  return nodes;
}

std::vector<std::shared_ptr<query::MySqlNodeData>>
MySqlClient::getNodesWithKeys(const std::unordered_set<std::string>& nodeMacs) {
  std::vector<std::shared_ptr<query::MySqlNodeData>> retNodes{};
  {
    auto nodes = nodes_.rlock();
    for (const auto& node : *nodes) {
      auto it = nodeMacs.find(node->mac);
      if (it != nodeMacs.end()) {
        retNodes.push_back(node);
      }
    }
  }
  return retNodes;
}

std::map<int64_t, std::shared_ptr<query::TopologyConfig>>
MySqlClient::getTopologyConfigs() {
  return topologyIdMap_.copy();
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
    std::map<int64_t, std::shared_ptr<query::TopologyConfig>> topologyIdTmp;
    while (res->next()) {
      auto config = std::make_shared<query::TopologyConfig>();
      config->id = res->getInt("id");
      config->name = res->getString("name");
      config->primary_controller.ip = res->getString("pip");
      config->primary_controller.api_port = res->getInt("papi_port");
      const std::string backupIp = res->getString("bip");
      if (!backupIp.empty()) {
        config->__isset.backup_controller = true;
        config->backup_controller.ip = backupIp;
        config->backup_controller.api_port = res->getInt("bapi_port");
      }
      const std::string wacType = res->getString("wac_type");
      if (!wacType.empty()) {
        config->__isset.wireless_controller = true;
        config->wireless_controller.type = wacType;
        config->wireless_controller.url = res->getString("wac_url");
        config->wireless_controller.username = res->getString("wac_username");
        config->wireless_controller.password = res->getString("wac_password");
      }
      // add to topology list
      topologyIdTmp[config->id] = config;
    }
    // refresh key ids for each topology
    refreshAggregateKeys(topologyIdTmp);
    topologyIdMap_.swap(topologyIdTmp);
    LOG(INFO) << "refreshTopologies:  " << topologyIdMap_.rlock()->size();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshTopologies ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshAggregateKeys(
    std::map<int64_t, std::shared_ptr<query::TopologyConfig>>&
        topologyIdMap) noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT `id`, `topology_id`, `key` FROM `agg_key`"));
    LOG(INFO) << "refreshAggregateKeys: Number of keys: " << res->rowsCount();
    while (res->next()) {
      int64_t keyId = res->getInt("id");
      int64_t topologyId = res->getInt("topology_id");
      std::string keyName = res->getString("key");

      std::transform(
          keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
      // insert into node id -> key mapping
      auto topologyIt = topologyIdMap.find(topologyId);
      if (topologyIt == topologyIdMap.end()) {
        LOG(WARNING) << "Invalid topology id (" << topologyId
                     << ") for key: " << keyName;
        continue;
      }
      // insert into keys map for topology
      topologyIt->second->keys[keyName] = keyId;
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshAggregateKeys ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::addAggKeys(
    const int64_t topologyId,
    const std::vector<std::string>& keyNames) noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        (*connection)
            ->prepareStatement(
                "INSERT IGNORE INTO `agg_key` (`topology_id`, `key`)"
                " VALUES (?, ?)"));

    for (const auto& key : keyNames) {
      prep_stmt->setInt(1, topologyId);
      prep_stmt->setString(2, key);
      prep_stmt->execute();
      LOG(INFO) << "addAggKey => key: " << key
                << " topology id: " << topologyId;
    }
    refreshTopologies();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "addAggKeys ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshNodes() noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT * FROM `nodes`"));
    std::vector<std::shared_ptr<query::MySqlNodeData>> nodesTmp;
    {
      auto macAddrToNode = macAddrToNode_.wlock();
      macAddrToNode->clear();
      auto nodeIdToNode = nodeIdToNode_.wlock();
      nodeIdToNode->clear();
      auto nameToNodeId = nodeNameToNodeId_.wlock();
      nameToNodeId->clear();
      auto duplicateNodes = duplicateNodes_.wlock();
      duplicateNodes->clear();
      while (res->next()) {
        auto node = std::make_shared<query::MySqlNodeData>();
        node->id = res->getInt("id");
        node->mac = res->getString("mac");
        node->node = res->getString("node");
        node->site = res->getString("site");
        node->network = res->getString("network");
        std::transform(
            node->mac.begin(), node->mac.end(), node->mac.begin(), ::tolower);
        macAddrToNode->emplace(node->mac, node);
        auto nameAdded = nameToNodeId->emplace(node->node, node);
        nodeIdToNode->emplace(node->id, node);
        if (!nameAdded.second) {
          LOG(ERROR) << "Duplicate node name: \"" << node->node
                     << "\", MAC1: " << nameToNodeId->at(node->node)->mac
                     << ", MAC2: " << node->mac;
          (*duplicateNodes)[node->node].insert(
              nameToNodeId->at(node->node)->mac);
          // record the duplicate
          (*duplicateNodes)[node->node].insert(node->mac);
        }
        nodesTmp.push_back(std::move(node));
      }
      LOG(INFO) << "refreshNodes: Number of nodes: " << nodeIdToNode->size();
    }
    nodes_.swap(nodesTmp);
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshNodes ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshStatKeys() noexcept {
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT `id`, `node_id`, `key` FROM `ts_key`"));

    LOG(INFO) << "refreshStatKeys: Number of keys: " << res->rowsCount();
    while (res->next()) {
      int64_t keyId = res->getInt("id");
      int64_t nodeId = res->getInt("node_id");
      std::string keyName = res->getString("key");

      std::transform(
          keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
      // insert into node id -> key mapping
      {
        auto nodeKeyIds = nodeKeyIds_.wlock();
        if (nodeKeyIds->find(nodeId) == nodeKeyIds->end()) {
          (*nodeKeyIds)[nodeId] = {};
        }
        (*nodeKeyIds)[nodeId][keyName] = keyId;
      }
      // insert into MySqlNodeData keyList
      {
        auto nodeIdToNode = nodeIdToNode_.wlock();
        auto itNode = nodeIdToNode->find(nodeId);
        if (itNode != nodeIdToNode->end()) {
          itNode->second->keyList[keyId] = keyName;
          VLOG(3) << "\tID: " << keyId << ", nodeId: " << nodeId
                  << ", keyName: " << keyName
                  << ", size: " << itNode->second->keyList.size();
        }
      }
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshStatKeys ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

bool MySqlClient::addOrUpdateNodes(
    const std::unordered_map<std::string, query::MySqlNodeData>&
        newNodes) noexcept {
  if (!newNodes.size()) {
    return false;
  }
  bool changed = false;
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return false;
    }
    // if there is a duplicate MAC address in the table, replace the node,
    // site, and network names; otherwise insert the new row
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        (*connection)
            ->prepareStatement("INSERT INTO `nodes` (`mac`, `node`, "
                               "`site`, `network`) VALUES (?, ?, ?, ?) "
                               "ON DUPLICATE KEY UPDATE `node`=?, `mac`=?, "
                               "`site`=?, `network`=?"));
    auto nodeNameToNodeId = nodeNameToNodeId_.rlock();
    auto duplicateNodes = duplicateNodes_.rlock();
    for (const auto& node : newNodes) {
      auto dupNodeIt = duplicateNodes->find(node.second.node);
      if (dupNodeIt != duplicateNodes->end()) {
        // delete the incorrect record
        std::unique_ptr<sql::PreparedStatement> deleteStmt(
            (*connection)
                ->prepareStatement("DELETE FROM `nodes` "
                                   "WHERE `node` = ? "
                                   "AND `network` = ? "
                                   "AND `mac` != ? LIMIT 1"));
        deleteStmt->setString(1, node.second.node);
        deleteStmt->setString(2, node.second.network);
        deleteStmt->setString(3, node.second.mac);
        // if another topology has the same node name we'll continuously log
        // this statement, even though we aren't going to delete it
        // TODO: this is safe, but needs to be corrected to use node name
        // as a unique index between multiple networks
        LOG(INFO) << "Attempting to delete node(s) \"" << node.second.node
                  << "\" on network \"" << node.second.network
                  << "\" not matching MAC: " << node.second.mac;
        deleteStmt->execute();
      }
      // compare node data
      auto nodeData = nodeNameToNodeId->find(node.second.node);
      if (nodeData != nodeNameToNodeId->end() &&
          nodeData->second->node == node.second.node &&
          nodeData->second->mac == node.second.mac &&
          nodeData->second->network == node.second.network &&
          nodeData->second->site == node.second.site) {
        // skip if node data is the same
        continue;
      }
      changed = true;
      prep_stmt->setString(1, node.second.mac);
      prep_stmt->setString(2, node.second.node);
      prep_stmt->setString(3, node.second.site);
      prep_stmt->setString(4, node.second.network);

      prep_stmt->setString(5, node.second.node);
      prep_stmt->setString(6, node.second.mac);
      prep_stmt->setString(7, node.second.site);
      prep_stmt->setString(8, node.second.network);
      prep_stmt->execute();
      LOG(INFO) << "addNode => mac: " << node.second.mac
                << " node: " << node.second.node
                << " network: " << node.second.network;
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "addNode ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode() << ")";
  }
  // only update nodes table if changed
  if (changed) {
    refreshNodes();
  }
  return changed;
}

void MySqlClient::addStatKeys(
    const std::unordered_map<int64_t, std::unordered_set<std::string>>&
        nodeKeys) noexcept {
  if (!nodeKeys.size()) {
    return;
  }
  LOG(INFO) << "addStatKeys for " << nodeKeys.size() << " nodes";
  try {
    auto connection = openConnection();
    if (!connection) {
      LOG(ERROR) << "Unable to open MySQL connection.";
      return;
    }
    sql::PreparedStatement* prep_stmt;
    prep_stmt =
        (*connection)
            ->prepareStatement(
                "INSERT IGNORE INTO `ts_key` (`node_id`, `key`) VALUES (?, ?)");

    for (const auto& keys : nodeKeys) {
      LOG(INFO) << "addStatKeys => node_id: " << keys.first
                << " Num of keys: " << keys.second.size();
      for (const auto& keyName : keys.second) {
        prep_stmt->setInt(1, keys.first);
        prep_stmt->setString(2, keyName);
        prep_stmt->execute();
      }
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "addStatKey ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }

  refreshStatKeys();
}

folly::Optional<int64_t> MySqlClient::getNodeId(
    const std::string& macAddr) const {
  std::string macAddrLower = macAddr;
  std::transform(
      macAddrLower.begin(),
      macAddrLower.end(),
      macAddrLower.begin(),
      ::tolower);
  {
    auto macAddrToNode = macAddrToNode_.rlock();
    auto it = macAddrToNode->find(macAddrLower);
    if (it != macAddrToNode->end()) {
      return (it->second->id);
    }
  }
  return folly::none;
}

folly::Optional<int64_t> MySqlClient::getNodeIdFromNodeName(
    const std::string& nodeName) const {
  {
    auto nodeNameToNodeId = nodeNameToNodeId_.rlock();
    auto it = nodeNameToNodeId->find(nodeName);
    if (it != nodeNameToNodeId->end()) {
      return (it->second->id);
    }
  }
  return folly::none;
}

folly::Optional<int64_t> MySqlClient::getKeyId(
    const int64_t nodeId,
    const std::string& keyName) const {
  std::string keyNameLower = keyName;
  std::transform(
      keyNameLower.begin(),
      keyNameLower.end(),
      keyNameLower.begin(),
      ::tolower);
  {
    auto nodeKeyIds = nodeKeyIds_.rlock();
    auto itNode = nodeKeyIds->find(nodeId);
    if (itNode != nodeKeyIds->end()) {
      auto itKey = itNode->second.find(keyNameLower);
      if (itKey != itNode->second.end()) {
        return (itKey->second);
      }
    }
  }
  return folly::none;
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
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(query));
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
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(query));
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
    const scans::MySqlScanTxResp& scanResponse,
    sql::Connection* connection) noexcept {
  try {
    std::string query =
        "INSERT INTO `tx_scan_results` "
        "(`token`, `combined_status`, `tx_node_id`, `start_bwgd`, "
        "`scan_type`, `network`,`scan_sub_type`, `scan_mode`, "
        "`apply_flag`, `status`, `tx_power`, `resp_id`, `tx_node_name`, "
        "`scan_resp`, `n_responses_waiting`) VALUES "
        "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection->prepareStatement(query));
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
      prep_stmt->setNull(14, 0); // scanResp
    } else {
      prep_stmt->setString(14, scanResponse.scanResp);
    }
    prep_stmt->setInt(15, scanResponse.nResponsesWaiting);

    prep_stmt->execute();
    return MySqlOk;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "Tx scan response ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
    return e.getErrorCode();
  }
}

bool MySqlClient::writeRxScanResponse(
    const scans::MySqlScanRxResp& scanResponse,
    const int64_t txId,
    sql::Connection* connection) noexcept {
  try {
    std::string query =
        "INSERT INTO `rx_scan_results` "
        "(`status`, `scan_resp`, `rx_node_id`, `tx_id`, `rx_node_name`, "
        "`new_beam_flag`) VALUES (?, ?, ?, ?, ?, ?)";
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection->prepareStatement(query));
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
    const std::vector<scans::MySqlScanResp>& mySqlScanResponses) noexcept {
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

void MySqlClient::addEvents(
    const query::NodeEvents& nodeEvents,
    const std::string& topologyName) {
  auto stmt =
      "INSERT INTO `event_log` "
      "(`mac`, `name`, `topologyName`, `source`, `timestamp`, `reason`, "
      "`details`, `category`, `level`, `subcategory`) "
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  auto connection = openConnection();
  if (!connection) {
    LOG(ERROR) << "Unable to open MySQL connection.";
    return;
  }
  try {
    for (const auto& event : nodeEvents.events) {
      auto category = folly::get_default(
          query::_EventCategory_VALUES_TO_NAMES, event.category, "UNKNOWN");
      auto subcategory = folly::get_default(
          query::_EventSubcategory_VALUES_TO_NAMES,
          event.subcategory,
          "UNKNOWN");
      auto level = folly::get_default(
          query::_EventLevel_VALUES_TO_NAMES, event.level, "UNKNOWN");
      std::unique_ptr<sql::PreparedStatement> prep_stmt(
          (*connection)->prepareStatement(stmt));
      prep_stmt->setString(1, nodeEvents.mac);
      prep_stmt->setString(2, nodeEvents.name);
      prep_stmt->setString(3, topologyName);
      prep_stmt->setString(4, event.source);
      prep_stmt->setUInt(5, event.timestamp);
      prep_stmt->setString(6, event.reason);
      prep_stmt->setString(7, event.details);
      prep_stmt->setString(8, category);
      prep_stmt->setString(9, level);
      prep_stmt->setString(10, subcategory);
      prep_stmt->execute();
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "addEvents ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
}

folly::dynamic MySqlClient::getEvents(
    const query::EventsQueryRequest& request) {
  auto eventQuery = folly::sformat(
      "SELECT * FROM `event_log` WHERE "
      "topologyName = \"{}\" "
      "{}{}{}"
      "AND timestamp >= {} "
      "ORDER BY id DESC LIMIT {}",
      request.topologyName,
      request.category.empty() ? "" :
          folly::sformat("AND category = \"{}\" ", request.category),
      request.subcategory.empty() ? "" :
          folly::sformat("AND subcategory = \"{}\" ", request.subcategory),
      request.level.empty() ? "" :
          folly::sformat("AND level = \"{}\" ", request.level),
      request.timestamp,
      request.maxResults);

  folly::dynamic events = folly::dynamic::array;
  auto connection = openConnection();
  if (!connection) {
    LOG(ERROR) << "Unable to open MySQL connection.";
    return events;
  }
  try {
    std::unique_ptr<sql::Statement> stmt((*connection)->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(eventQuery));
    while (res->next()) {
      events.push_back(
          folly::dynamic::object("mac", res->getString("mac").asStdString())(
              "name", res->getString("name").asStdString())(
              "source", res->getString("source").asStdString())(
              "timestamp", res->getInt("timestamp"))(
              "reason", res->getString("reason").asStdString())(
              "details", res->getString("details").asStdString())(
              "category", res->getString("category").asStdString())(
              "subcategory", res->getString("subcategory").asStdString())(
              "level", res->getString("level").asStdString()));
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "getEvents ERR: " << e.what();
    LOG(ERROR) << "\tMySQL error code: " << e.getErrorCode();
  }
  return events;
}

} // namespace gorilla
} // namespace facebook
