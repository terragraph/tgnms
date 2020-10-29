/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "if/gen-cpp2/Stats_types_custom_protocol.h"

namespace facebook {
namespace terragraph {
namespace stats {

struct FirmwareStats {
  double fwUptime{-1};
  double linkAvail{-1};
};

typedef std::map<time_t /* ts */, FirmwareStats> LinkStatsByTime;

struct LinkStatsByDirection {
  LinkStatsByTime linkA;
  LinkStatsByTime linkZ;
};

class NetworkHealthUtils {
 public:
  explicit NetworkHealthUtils();
  virtual ~NetworkHealthUtils();

  // generate events from link stats
  // we could pass in the last event from the DB
  // if no ID set on event, new, otherwise update. bulk?
  static std::vector<thrift::EventDescription> processLinkStats(
      folly::Optional<thrift::EventDescription> lastEvent,
      LinkStatsByTime& linkStats);

  // update link events for a single link/direction
  static void updateLinkEventRecords(
      const std::string& topologyName,
      const std::string& linkName,
      const thrift::LinkDirection& linkDirection,
      const std::vector<thrift::EventDescription>& eventList);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
