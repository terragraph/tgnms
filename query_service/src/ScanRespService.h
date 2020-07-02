/**
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <unordered_map>

#include <folly/Synchronized.h>
#include <folly/dynamic.h>
#include <folly/io/async/EventBaseManager.h>

#include "if/gen-cpp2/Controller_types_custom_protocol.h"
#include "if/gen-cpp2/scans_types_custom_protocol.h"

namespace facebook {
namespace terragraph {
namespace stats {

class ScanRespService {
 public:
  explicit ScanRespService();
  ~ScanRespService();

 private:
  folly::EventBase eb_;
  std::thread ebThread_;
  std::unique_ptr<folly::AsyncTimeout> timer_{nullptr};

  enum StatusEvent {
    TX_ERROR = 0,
    RX_ERROR = 1,
    INCOMPLETE_RESPONSE = 2,
  };

  // keep track of the latest scan respId
  std::unordered_map<
      std::string /* topology name */,
      int /* latest scan respId */>
      scanRespId_;

  // keep track of the latest BWGD
  std::unordered_map<
      std::string /* topology name */,
      int64_t /* last BWGD at startup time */>
      lastBwgdAtStartup_;

  int writeData(
      const terragraph::thrift::ScanStatus& scanStatus,
      const std::string& toplogyName);
  folly::dynamic getScanRespIdRange(const std::string& topologyName);
  void setNewScanRespId(
      const terragraph::thrift::ScanStatus& scanStatus,
      const std::string& topologyName);
  void timerCb();
  void updateTopology();
  folly::Optional<std::string> serializeAndCompress(
      const terragraph::thrift::ScanResp& str);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
