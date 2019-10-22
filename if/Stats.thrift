/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

include "Topology.thrift"

namespace cpp2 facebook.stats
namespace py facebook.stats

enum KeyUnit {
  // no scaling
  NONE = 0,
  // no scaling, range [0,100]
  PERC = 1,
  // assume data in bytes/sec, will convert to bits/sec
  BYTES_PER_SEC = 2,
}

// type of restriction to apply
enum LinkDirection {
  LINK_A = 1,
  LINK_Z = 2,
}

struct KeyMetaData {
  2: string keyName,
  // short name if one is associated
  3: optional string shortName,
  // the node reporting the stat
  10: string srcNodeMac,
  11: string srcNodeName,
  // peer name
  21: optional string peerNodeMac,
  // link details
  30: optional string linkName,
  31: optional LinkDirection linkDirection,
  32: optional string topologyName,

  100: KeyUnit unit,
}

// type of restriction to apply
enum LinkStateType {
  LINK_DOWN_OR_NOT_AVAIL = 0,
  LINK_UP = 1,
  LINK_UP_DATADOWN = 2,
  LINK_UP_AVAIL_UNKNOWN = 3,
}

// output formats
struct EventDescription {
  1: i64 dbId,
  10: i64 startTime,
  11: i64 endTime,
  20: optional string description,
  21: optional LinkStateType linkState,
}

struct EventList {
  // percentage - link is in LINK_UP or LINK_UP_DATADOWN (heartbeats going)
  1: double linkAlive,
  2: list<EventDescription> events,
  // percentage - link is in LINK_UP - capable of passing data packets
  3: optional double linkAvailForData,
}

/**
 * @apiDefine LinkMetric
 * @apiParam {String} [shortName]
 *           The short or common name e.g. "fw_uptime"
 * @apiParam {String} [keyName]
             The raw key name published by the node.
 *           For firmware the key is assumed to be in the format
 *           <keyPrefix>.<node MAC address>.<keyName>
 *           e.g. tgf.00:11:22:33:44:55.staPkt.mgmtLinkUp
 * @apiParam {String} keyPrefix See keyName
 * @apiParam {String} description Human readable
 */
struct LinkMetric {
  1: string shortName,
  10: string keyName,
  11: string keyPrefix,
  20: string description,
}
