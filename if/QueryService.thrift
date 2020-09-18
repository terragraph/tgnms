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
  // 400: optional WirelessController wireless_controller,
}

struct ErrorResponse {
  1: list<string> errorList,
}
