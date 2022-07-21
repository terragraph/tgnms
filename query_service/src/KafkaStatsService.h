/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <chrono>
#include <string>
#include <thread>

#include <folly/Optional.h>

#include "if/gen-cpp2/Aggregator_types_custom_protocol.h"

namespace facebook {
namespace terragraph {
namespace stats {

class KafkaStatsService {
 public:
  KafkaStatsService(
      const std::string& brokerEndpointList,
      const std::string& statsTopic,
      const int intervalSec,
      const std::string& consumerId);
  ~KafkaStatsService();

  void start(const std::string& topicName);

  // return a copy of the friendly/short metric name (snr, mcs, etc) if one
  // exists for the node stat
  folly::Optional<terragraph::thrift::AggrStat> getFriendlyMetric(
      const terragraph::thrift::AggrStat& stat);

 private:
  std::thread workerThread_;
  std::string brokerEndpointList_;
  int intervalSec_;
  std::string consumerId_;
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
