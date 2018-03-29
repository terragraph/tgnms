/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "MySqlClient.h"

#include <utility>
#include <unistd.h>

#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_string(mysql_url, "localhost", "mysql host");
DEFINE_string(mysql_user, "root", "mysql user");
DEFINE_string(mysql_pass, "", "mysql passward");
DEFINE_string(mysql_database, "cxl", "mysql database");

namespace facebook {
namespace gorilla {

MySqlClient::MySqlClient() {
  try {
    driver_ = sql::mysql::get_driver_instance();
    sql::ConnectOptionsMap connProps;
    connProps["hostName"] = FLAGS_mysql_url;
    connProps["userName"] = FLAGS_mysql_user;
    connProps["password"] = FLAGS_mysql_pass;
    connProps["OPT_RECONNECT"] = true;
    connection_ = std::unique_ptr<sql::Connection>(driver_->connect(connProps));
    connection_->setSchema(FLAGS_mysql_database);
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "connect ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshAll() noexcept {
  refreshNodes();
  refreshStatKeys();
  refreshTopologies();
}

std::vector<std::shared_ptr<query::MySqlNodeData>> MySqlClient::getNodes() {
  std::vector<std::shared_ptr<query::MySqlNodeData>> nodes{};
  for (auto& it : macAddrToNode_) {
    nodes.push_back(it.second);
  }
  return nodes;
}

std::vector<std::shared_ptr<query::MySqlNodeData>>
MySqlClient::getNodesWithKeys() {
  return nodes_;
}

std::vector<std::shared_ptr<query::MySqlNodeData>> MySqlClient::getNodes(
    const std::unordered_set<std::string>& nodeMacs) {
  std::vector<std::shared_ptr<query::MySqlNodeData>> nodes{};
  for (const auto& mac : nodeMacs) {
    auto it = macAddrToNode_.find(mac);
    if (it != macAddrToNode_.end()) {
      nodes.push_back(it->second);
    }
  }
  return nodes;
}

std::vector<std::shared_ptr<query::MySqlNodeData>>
MySqlClient::getNodesWithKeys(const std::unordered_set<std::string>& nodeMacs) {
  std::vector<std::shared_ptr<query::MySqlNodeData>> nodes{};
  for (auto node : nodes_) {
    auto it = nodeMacs.find(node->mac);
    if (it != nodeMacs.end()) {
      nodes.push_back(node);
    }
  }
  return nodes;
}

std::map<int64_t, std::shared_ptr<query::TopologyConfig>>
MySqlClient::getTopologyConfigs() {
  return topologyIdMap_;
}

void MySqlClient::refreshTopologies() noexcept {
  // load all topologies
  try {
    std::unique_ptr<sql::Statement> stmt(connection_->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT * FROM `topologies`"));
    std::map<int64_t, std::shared_ptr<query::TopologyConfig>> topologyIdTmp;
    while (res->next()) {
      auto config = std::make_shared<query::TopologyConfig>();
      config->id = res->getInt("id");
      config->name = res->getString("name");
      config->initial_latitude = res->getDouble("initial_latitude");
      config->initial_longitude = res->getDouble("initial_longitude");
      config->initial_zoom_level = res->getDouble("initial_zoom_level");
      config->e2e_ip = res->getString("e2e_ip");
      config->e2e_port = res->getInt("e2e_port");
      config->api_ip = res->getString("api_ip");
      config->api_port = res->getInt("api_port");
      // add to topology list
      topologyIdTmp[config->id] = config;
    }
    // refresh key ids for each topology
    refreshAggregateKeys(topologyIdTmp);
    topologyIdMap_.swap(topologyIdTmp);
    LOG(INFO) << "refreshTopologies:  " << topologyIdMap_.size();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshTopologies ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshAggregateKeys(
    std::map<int64_t, std::shared_ptr<query::TopologyConfig>>&
        topologyIdMap) noexcept {
  try {
    std::unique_ptr<sql::Statement> stmt(connection_->createStatement());
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
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::addAggKeys(
    const int64_t topologyId,
    const std::vector<std::string>& keyNames) noexcept {
  try {
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection_->prepareStatement(
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
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshNodes() noexcept {
  try {
    std::unique_ptr<sql::Statement> stmt(connection_->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT * FROM `nodes`"));
    std::vector<std::shared_ptr<query::MySqlNodeData>> nodesTmp;
    while (res->next()) {
      auto node = std::make_shared<query::MySqlNodeData>();
      node->id = res->getInt("id");
      node->mac = res->getString("mac");
      node->node = res->getString("node");
      node->network = res->getString("network");
      node->site = res->getString("site");
      std::transform(
          node->mac.begin(), node->mac.end(), node->mac.begin(), ::tolower);
      macAddrToNode_[node->mac] = node;
      nodeNameToNodeId_[node->node] = node;
      nodeIdToNode_[node->id] = node;
      nodesTmp.push_back(node);
    }
    nodes_.swap(nodesTmp);
    LOG(INFO) << "refreshNodes: Number of nodes: " << nodeIdToNode_.size();
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshNodes ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshStatKeys() noexcept {
  try {
    std::unique_ptr<sql::Statement> stmt(connection_->createStatement());
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
      if (nodeKeyIds_.find(nodeId) == nodeKeyIds_.end()) {
        nodeKeyIds_[nodeId] = {};
      }
      nodeKeyIds_[nodeId][keyName] = keyId;
      // insert into MySqlNodeData keyList
      auto itNode = nodeIdToNode_.find(nodeId);
      if (itNode != nodeIdToNode_.end()) {
        itNode->second->keyList[keyId] = keyName;
        VLOG(3) << "\tID: " << keyId << ", nodeId: " << nodeId
                << ", keyName: " << keyName
                << ", size: " << itNode->second->keyList.size();
      }
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "refreshStatKeys ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::addOrUpdateNodes(
    const std::unordered_map<std::string, query::MySqlNodeData>&
        newNodes) noexcept {
  if (!newNodes.size()) {
    return;
  }
  try {
    // if there is a duplicate MAC address in the table, replace the node,
    // site, and network names; otherwise insert the new row
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection_->prepareStatement(
            "INSERT INTO `nodes` (`mac`, `node`, "
            "`site`, `network`) VALUES (?, ?, ?, ?) "
            "ON DUPLICATE KEY UPDATE `node`=?, `site`=?, "
            "`network`=?"));

    for (const auto& node : newNodes) {
      prep_stmt->setString(1, node.second.mac);
      prep_stmt->setString(2, node.second.node);
      prep_stmt->setString(3, node.second.site);
      prep_stmt->setString(4, node.second.network);
      prep_stmt->setString(5, node.second.node);
      prep_stmt->setString(6, node.second.site);
      prep_stmt->setString(7, node.second.network);
      prep_stmt->execute();
      VLOG(4) << "addNode => mac: " << node.second.mac
              << " Network: " << node.second.network;
    }
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "addNode ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode() << ")";
  }

  refreshNodes();
}

void MySqlClient::addStatKeys(
    const std::unordered_map<int64_t, std::unordered_set<std::string>>&
        nodeKeys) noexcept {
  if (!nodeKeys.size()) {
    return;
  }
  LOG(INFO) << "addStatKeys for " << nodeKeys.size() << " nodes";
  try {
    sql::PreparedStatement* prep_stmt;
    prep_stmt = connection_->prepareStatement(
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
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
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
  auto it = macAddrToNode_.find(macAddrLower);
  if (it != macAddrToNode_.end()) {
    return (it->second->id);
  }
  return folly::none;
}

folly::Optional<int64_t> MySqlClient::getNodeIdFromNodeName(
    const std::string& nodeName) const {
  auto it = nodeNameToNodeId_.find(nodeName);
  if (it != nodeNameToNodeId_.end()) {
    return (it->second->id);
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

  auto itNode = nodeKeyIds_.find(nodeId);
  if (itNode != nodeKeyIds_.end()) {
    auto itKey = itNode->second.find(keyNameLower);
    if (itKey != itNode->second.end()) {
      return (itKey->second);
    }
  }
  return folly::none;
}

int64_t MySqlClient::getLastId(
    const int token,
    const int64_t startBwgd,
    const std::string& network) noexcept {
  try {
    std::string query =
        "SELECT id FROM tx_scan_results WHERE token=" + std::to_string(token) +
        " AND start_bwgd=" + std::to_string(startBwgd) +
        " AND network='" + network + "'";
    std::unique_ptr<sql::Statement> stmt(connection_->createStatement());
    std::unique_ptr<sql::ResultSet> res(stmt->executeQuery(query));
    if (res->next()) {
      return res->getInt64("id");
    } else {
      return -1;
    }

  } catch (sql::SQLException& e) {
    LOG(ERROR) << "ERROR reading last inserted ID: " << e.what();
    LOG(ERROR) << " MySQL error code: " << e.getErrorCode();
  }
}

// there are two mySQL tables for scan responses - tx and rx
// each row of the table is a single scan response from a node
// to retrieve scan results, the tables are JOINed by token/network/bwgd
int MySqlClient::writeTxScanResponse(
    const scans::MySqlScanTxResp& scanResponse) noexcept {
  try {
    std::string query =
        "INSERT INTO `tx_scan_results` "
        "(`token`, `combined_status`, `tx_node_id`, `start_bwgd`, "
        "`scan_type`, `network`,`scan_sub_type`, `scan_mode`, "
        "`apply_flag`, `status`, `tx_power`, `resp_id`, `tx_node_name`, "
        "`scan_resp`) VALUES "
        "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COMPRESS(?))";
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection_->prepareStatement(query));
    LOG(INFO) << "Scan response token:" << scanResponse.token
              << " respId:" << scanResponse.respId;
    prep_stmt->setInt(1, scanResponse.token);
    prep_stmt->setInt(2, scanResponse.combinedStatus);
    prep_stmt->setInt(3, scanResponse.txNodeId);
    prep_stmt->setUInt64(4, scanResponse.startBwgd);
    prep_stmt->setInt(5, scanResponse.scanType);
    prep_stmt->setString(6, scanResponse.network);
    prep_stmt->setInt(7, scanResponse.scanSubType);
    prep_stmt->setInt(8, scanResponse.scanMode);
    prep_stmt->setInt(9, scanResponse.applyFlag);
    prep_stmt->setInt(10, scanResponse.status);
    prep_stmt->setInt(11, scanResponse.txPower);
    prep_stmt->setInt(12, scanResponse.respId);
    prep_stmt->setString(13, scanResponse.txNodeName);
    prep_stmt->setString(14, scanResponse.scanResp);
    prep_stmt->execute();
    return MYSQL_NO_ERROR;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "Tx scan response ERR: " << e.what();
    LOG(ERROR) << " MySQL error code: " << e.getErrorCode();
    return e.getErrorCode();
  }
}

bool MySqlClient::writeRxScanResponse(
    const scans::MySqlScanRxResp& scanResponse,
    const int64_t txId) noexcept {
  try {
    std::string query =
        "INSERT INTO `rx_scan_results` "
        "(`status`, `scan_resp`, `rx_node_id`, `tx_id`, `rx_node_name`, "
        "`new_beam_flag`) VALUES (?, COMPRESS(?), ?, ?, ?, ?)";
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection_->prepareStatement(query));
    prep_stmt->setInt(1, scanResponse.status);
    prep_stmt->setString(2, scanResponse.scanResp);
    prep_stmt->setInt(3, scanResponse.rxNodeId);
    prep_stmt->setUInt64(4, txId);
    prep_stmt->setString(5, scanResponse.rxNodeName);
    prep_stmt->setInt(6, scanResponse.newBeamFlag);
    prep_stmt->execute();
    return true;
  } catch (sql::SQLException& e) {
    LOG(ERROR) << "Rx scan response ERR: " << e.what();
    LOG(ERROR) << " MySQL error code: " << e.getErrorCode();
    return false;
  }
}

bool MySqlClient::writeScanResponses(
    const std::vector<scans::MySqlScanResp>& mySqlScanResponses) noexcept {
  int numScansWritten = 0;
  for (const auto& mySqlScanResponse : mySqlScanResponses) {
    int errCode;
    if ((errCode = writeTxScanResponse(mySqlScanResponse.txResponse)) ==
        MYSQL_NO_ERROR) {
      numScansWritten++;
      int64_t tx_id = getLastId(
          mySqlScanResponse.txResponse.token,
          mySqlScanResponse.txResponse.startBwgd,
          mySqlScanResponse.txResponse.network);
      if (tx_id > 0) {
        for (const auto& rxResponse : mySqlScanResponse.rxResponses) {
          if (!writeRxScanResponse(rxResponse, tx_id)) {
            return false;
          }
        }
      } else {
        return false;
      }
    } else if (errCode != MYSQL_DUPLICATE_ENTRY) {
      // if the error is something other than duplicate entry,
      // something is wrong
      return false;
    }
  }
  LOG(INFO) << "Successfully wrote " << numScansWritten << " scans";
  return true;
}

} // namespace gorilla
} // namespace facebook
