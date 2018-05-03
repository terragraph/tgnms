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
  }
  catch (sql::SQLException &e) {
    LOG(ERROR) << "connect ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::refreshAll() noexcept {
  refreshNodes();
  refreshStatKeys();
}

std::vector<std::shared_ptr<query::MySqlNodeData> > MySqlClient::getNodes() {
  std::vector<std::shared_ptr<query::MySqlNodeData> > nodes{};
  for (auto &it : macAddrToNode_) {
    nodes.push_back(it.second);
  }
  return nodes;
}

std::vector<std::shared_ptr<query::MySqlNodeData> >
MySqlClient::getNodesWithKeys() {
  return nodes_;
}

std::vector<std::shared_ptr<query::MySqlNodeData> >
MySqlClient::getNodes(const std::unordered_set<std::string> &nodeMacs) {
  std::vector<std::shared_ptr<query::MySqlNodeData> > nodes{};
  for (const auto &mac : nodeMacs) {
    auto it = macAddrToNode_.find(mac);
    if (it != macAddrToNode_.end()) {
      nodes.push_back(it->second);
    }
  }
  return nodes;
}

std::vector<std::shared_ptr<query::MySqlNodeData> >
MySqlClient::getNodesWithKeys(const std::unordered_set<std::string> &nodeMacs) {
  std::vector<std::shared_ptr<query::MySqlNodeData> > nodes{};
  for (auto node : nodes_) {
    auto it = nodeMacs.find(node->mac);
    if (it != nodeMacs.end()) {
      nodes.push_back(node);
    }
  }
  return nodes;
}

void MySqlClient::refreshNodes() noexcept {
  try {
    std::unique_ptr<sql::Statement> stmt(connection_->createStatement());
    std::unique_ptr<sql::ResultSet> res(
        stmt->executeQuery("SELECT * FROM `nodes`"));
    while (res->next()) {
      auto node = std::make_shared<query::MySqlNodeData>();
      node->id = res->getInt("id");
      node->node = res->getString("node");
      node->mac = res->getString("mac");
      node->network = res->getString("network");
      node->site = res->getString("site");
      std::transform(node->mac.begin(), node->mac.end(), node->mac.begin(),
                     ::tolower);
      macAddrToNode_[node->mac] = node;
      nodeIdToNode_[node->id] = node;
      nodes_.push_back(node);
    }
    LOG(INFO) << "refreshNodes: Number of nodes: " << nodeIdToNode_.size();
  }
  catch (sql::SQLException &e) {
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

      std::transform(keyName.begin(), keyName.end(), keyName.begin(),
                     ::tolower);
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
  }
  catch (sql::SQLException &e) {
    LOG(ERROR) << "refreshStatKeys ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }
}

void MySqlClient::addNodes(
    std::unordered_map<std::string, query::MySqlNodeData> newNodes) noexcept {
  if (!newNodes.size()) {
    return;
  }
  try {
    std::unique_ptr<sql::PreparedStatement> prep_stmt(
        connection_->prepareStatement(
            "INSERT IGNORE INTO `nodes` (`mac`, `node`, "
            "`site`, `network`) VALUES (?, ?, ?, ?)"));

    for (const auto &node : newNodes) {
      prep_stmt->setString(1, node.second.mac);
      prep_stmt->setString(2, node.second.node);
      prep_stmt->setString(3, node.second.site);
      prep_stmt->setString(4, node.second.network);
      prep_stmt->execute();
      LOG(INFO) << "addNode => mac: " << node.second.mac
                << " Network: " << node.second.network;
    }
  }
  catch (sql::SQLException &e) {
    LOG(ERROR) << "addNode ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }

  //  refreshNodes();
}

void MySqlClient::addStatKeys(std::unordered_map<
    int64_t, std::unordered_set<std::string> > nodeKeys) noexcept {
  if (!nodeKeys.size()) {
    return;
  }
  LOG(INFO) << "addStatKeys for " << nodeKeys.size() << " nodes";
  try {
    sql::PreparedStatement *prep_stmt;
    prep_stmt = connection_->prepareStatement(
        "INSERT IGNORE INTO `ts_key` (`node_id`, `key`) VALUES (?, ?)");

    for (const auto &keys : nodeKeys) {
      LOG(INFO) << "addStatKeys => node_id: " << keys.first
                << " Num of keys: " << keys.second.size();
      for (const auto &keyName : keys.second) {
        prep_stmt->setInt(1, keys.first);
        prep_stmt->setString(2, keyName);
        prep_stmt->execute();
      }
    }
  }
  catch (sql::SQLException &e) {
    LOG(ERROR) << "addStatKey ERR: " << e.what();
    LOG(ERROR) << " (MySQL error code: " << e.getErrorCode();
  }

  refreshStatKeys();
}

folly::Optional<int64_t>
MySqlClient::getNodeId(const std::string &macAddr) const {
  std::string macAddrLower = macAddr;
  std::transform(macAddrLower.begin(), macAddrLower.end(), macAddrLower.begin(),
                 ::tolower);
  auto it = macAddrToNode_.find(macAddrLower);
  if (it != macAddrToNode_.end()) {
    return (it->second->id);
  }
  return folly::none;
}

folly::Optional<int64_t>
MySqlClient::getKeyId(const int64_t nodeId, const std::string &keyName) const {
  std::string keyNameLower = keyName;
  std::transform(keyNameLower.begin(), keyNameLower.end(), keyNameLower.begin(),
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

}
} // facebook::gorilla
