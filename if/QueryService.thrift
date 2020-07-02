/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

include "Topology.thrift"
include "Event.thrift"

namespace cpp2 facebook.terragraph.thrift

// used by WirelessControllerStatsHandler
struct WirelessControllerStatsRequest {
  1: string topologyName,
}
struct WirelessController {
  1: string url,
  2: string type,
  10: string username,
  11: string password,
}

// used by LogsWriteHandler
struct Log {
  1: i64 ts, /* Timestamp in us */
  2: string file, /* Filename */
  3: string log, /* Log line */
}
struct NodeLogs {
  1: string mac,
  2: string name,
  3: string site,
  4: list<Log> logs,
}
struct LogsWriteRequest {
  // Topology struct used for compatibility - only Topology.name filled
  1: Topology.Topology topology,
  2: list<NodeLogs> agents,
}

// used by EventsHandler
struct NodeEvents {
  1: string mac,
  2: string name,
  3: string site,
  4: list<Event.Event> events,
}
struct EventsWriteRequest {
  // Topology struct used for compatibility - only Topology.name filled
  1: Topology.Topology topology,
  2: list<NodeEvents> agents,
}
struct EventsQueryRequest {
  1: string topologyName,
  2: i64 timestamp,
  3: i32 maxResults = 100,
  4: string category,
  5: string level,
  6: string subcategory,
}

// used everywhere
struct ControllerEndpoint {
  1: string ip,
  2: i32 api_port,
}
struct TopologyConfig {
  1: i32 id,
  10: string name,

  100: ControllerEndpoint primary_controller,
  110: optional ControllerEndpoint backup_controller,

  200: optional Topology.Topology topology,
  // Wireless Access Controller
  400: optional WirelessController wireless_controller,
}

struct ErrorResponse {
  1: list<string> errorList,
}
