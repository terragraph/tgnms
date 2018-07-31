/**
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "ApiServiceClient.h"

#include <folly/Synchronized.h>
#include <folly/io/async/EventBaseManager.h>
#include "beringei/if/gen-cpp2/scans_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class ScanRespService {
 public:
  explicit ScanRespService(std::shared_ptr<ApiServiceClient> apiServiceClient);

  // run eventbase
  void start();

 private:
  enum StatusEvent {
    TX_ERROR = 0,
    RX_ERROR = 1,
    INCOMPLETE_RESPONSE = 2,
  };
  folly::EventBase eb_;
  std::unique_ptr<folly::AsyncTimeout> timer_{nullptr};

  // keep track of the latest scan respId
  std::unordered_map<
      std::string /* topology name */,
      int /* latest scan respId */>
      scanRespId_;

  // keep track of the latest BWGD
  int64_t lastBwgdAtStartup_;

  // from queryservicefactory
  std::shared_ptr<ApiServiceClient> apiServiceClient_;

  int writeData(
      const scans::ScanStatus& scanStatus,
      const std::string& toplogyName);
  std::string getScanRespIdRange(const std::string& topologyName);
  void setNewScanRespId(
      const scans::ScanStatus& scanStatus,
      const std::string& topologyName);
  void timerCb();
  void updateTopology();
};
} // namespace gorilla
} // namespace facebook
