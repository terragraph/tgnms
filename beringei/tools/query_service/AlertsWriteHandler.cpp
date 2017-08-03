/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "AlertsWriteHandler.h"

#include <ctime>
#include <utility>

#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <proxygen/httpserver/ResponseBuilder.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

#include "mysql_connection.h"
#include "mysql_driver.h"

#include <cppconn/driver.h>
#include <cppconn/exception.h>
#include <cppconn/prepared_statement.h>
#include <cppconn/resultset.h>
#include <cppconn/statement.h>

#include <algorithm>

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::microseconds;
using std::chrono::system_clock;
using namespace proxygen;

namespace facebook {
namespace gorilla {

AlertsWriteHandler::AlertsWriteHandler(std::shared_ptr<MySqlClient> mySqlClient)
    : RequestHandler(), mySqlClient_(mySqlClient) {}

void AlertsWriteHandler::onRequest(
    std::unique_ptr<HTTPMessage> /* unused */) noexcept {
  // nothing to do
}

void AlertsWriteHandler::onBody(std::unique_ptr<folly::IOBuf> body) noexcept {
  if (body_) {
    body_->prependChain(move(body));
  } else {
    body_ = move(body);
  }
}

std::string AlertsWriteHandler::getMySqlTimestamp(int64_t timeInUsec) {
  time_t curr_time;
  tm* curr_tm;
  char date_string[100];

  time(&curr_time);
  curr_tm = localtime(&curr_time);

  strftime(date_string, 50, "%Y-%m-%d %X", curr_tm);
  return std::string(date_string);
}

void AlertsWriteHandler::writeData(AlertsWriteRequest request) {
  std::unordered_map<std::string, MySqlNodeData> unknownNodes;

  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();

  auto nodeId = mySqlClient_->getNodeId(request.node_mac);
  if (!nodeId) {
    MySqlNodeData newNode;
    newNode.mac = request.node_mac;
    newNode.node = request.node_name;
    newNode.site = request.node_site;
    newNode.network = request.node_topology;
    unknownNodes[newNode.mac] = newNode;
    LOG(INFO) << "Unknown mac: " << request.node_mac;
    mySqlClient_->addNodes(unknownNodes);
    return;
  }

  std::string tsParsed = getMySqlTimestamp(request.timestamp);
  MySqlAlertData row;
  row.node_id = *nodeId;
  row.timestamp = tsParsed;
  row.alert_id = request.alert_id;
  row.alert_regex = request.alert_regex;
  row.alert_threshold = request.alert_threshold;
  row.alert_comparator = request.alert_comparator;
  row.alert_level = request.alert_level;
  row.trigger_key = request.trigger_key;
  row.trigger_value = request.trigger_value;

  folly::EventBase eb;
  eb.runInLoop([this, &row]() mutable { mySqlClient_->addAlert(row); });
  std::thread tEb([&eb]() { eb.loop(); });
  tEb.join();

  auto endTime = (int64_t)duration_cast<milliseconds>(
                     system_clock::now().time_since_epoch())
                     .count();
  LOG(INFO) << "Writeing alerts complete. "
            << "Total: " << (endTime - startTime) << "ms.";
}

void AlertsWriteHandler::onEOM() noexcept {
  auto body = body_->moveToFbString();
  AlertsWriteRequest request;
  try {
    request = SimpleJSONSerializer::deserialize<AlertsWriteRequest>(body);
  } catch (const std::exception&) {
    LOG(INFO) << "Error deserializing alerts_writer request";
    ResponseBuilder(downstream_)
        .status(500, "OK")
        .header("Content-Type", "application/json")
        .body("Failed de-serializing alerts_writer request")
        .sendWithEOM();
    return;
  }
  logRequest(request);
  LOG(INFO) << "Alerts writer request from \"" << request.node_topology << "\"";

  folly::fbstring jsonResp;
  try {
    writeData(request);
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to handle alerts_writer request: " << ex.what();
    ResponseBuilder(downstream_)
        .status(500, "OK")
        .header("Content-Type", "application/json")
        .body("Failed handling alerts_writer request")
        .sendWithEOM();
    return;
  }
  ResponseBuilder(downstream_)
      .status(200, "OK")
      .header("Content-Type", "application/json")
      .body(jsonResp)
      .sendWithEOM();
}

void AlertsWriteHandler::onUpgrade(UpgradeProtocol /* unused */) noexcept {}

void AlertsWriteHandler::requestComplete() noexcept {
  delete this;
}

void AlertsWriteHandler::onError(ProxygenError /* unused */) noexcept {
  LOG(ERROR) << "Proxygen reported error";
  // In QueryServiceFactory, we created this handler using new.
  // Proxygen does not delete the handler.
  delete this;
}

void AlertsWriteHandler::logRequest(AlertsWriteRequest request) {}
}
} // facebook::gorilla
