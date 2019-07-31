/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <chrono>
#include <string>

#include <folly/Optional.h>

#include "beringei/if/gen-cpp2/Aggregator_types_custom_protocol.h"

namespace facebook {
namespace gorilla {

class KafkaStatsService {
 public:
  KafkaStatsService(
      const std::string& brokerEndpointList,
      const std::string& statsTopic,
      const int intervalSec,
      const int consumerId);
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
  int consumerId_;
};

} // namespace gorilla
} // namespace facebook
