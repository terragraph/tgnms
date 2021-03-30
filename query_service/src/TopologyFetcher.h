/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "ApiServiceClient.h"

#include "if/gen-cpp2/QueryService_types_custom_protocol.h"
#include "if/gen-cpp2/Topology_types_custom_protocol.h"

#include <folly/Synchronized.h>
#include <folly/io/async/EventBaseManager.h>

namespace facebook {
namespace terragraph {
namespace stats {

class TopologyFetcher {
 public:
  explicit TopologyFetcher();
  ~TopologyFetcher();
  void refreshTopologyCache();

 private:
  folly::EventBase eb_;
  std::thread ebThread_;
  std::unique_ptr<folly::AsyncTimeout> timer_{nullptr};
  std::unique_ptr<folly::AsyncTimeout> ruckusTimer_{nullptr};
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
