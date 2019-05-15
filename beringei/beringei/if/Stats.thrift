/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

include "beringei/if/Topology.thrift"

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
enum RestrictorType {
  NODE = 1,
  LINK = 2,
}

enum TypeaheadType {
  KEYNAME = 1, // default
  NODENAME = 3, // to find a node name
  TOPOLOGYNAME = 4, // to find the topology
}

struct QueryRestrictor {
  1: RestrictorType restrictorType,
  // list of values allowed in the response data
  // EX: ["Node-A", "Node-B"] returns both Node-A and Node-B
  2: list<string> values,
}



struct TypeaheadRequest {
  1: optional string topologyName,
  // search term to match key names + short names against
  2: optional string searchTerm,
  3: TypeaheadType typeaheadType = TypeaheadType.KEYNAME,
  /**
   * list of ordered restrictors to apply
   * leave empty to return all results
   * EX:
   * Restrict to 'link' metrics that are published by NodeA
   * [
   *    {
   *      restrictorType=LINK,
   *      values=["Link-NodeA-NodeB"]
   *    },
   *    {
   *      restrictorType=NODE,
   *      values=["NodeA"]
   *    }
   * ]
   */
  10: list<QueryRestrictor> restrictors,
  /**
  * When searching for keynames for the purpose of displaying them for
  * plotting on a dashboard, there is no need to return multiple keyIds
  * for the same keyName
  */
  11: optional bool noDuplicateKeyNames = false,
  // output debug data to console for this request
  1000: optional bool debugLogToConsole = false,
}

enum LinkDirection {
  LINK_A = 1,
  LINK_Z = 2,
}

struct KeyMetaData {
  1: i64 keyId,
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

struct TypeaheadResponse {
  // key name -> [meta data]
  // {
  //
  // }
  1: map<string /* key name */, list<KeyMetaData>> results,
}

enum StatsOutputFormat {
  // return a format optimized for charting libraries
  // [
  //    [TS1, KEY1-VALUE1, KEY2-VALUE1, ..],
  //    [TS2, KEY1-VALUE2, KEY2-VALUE2, ..]
  //    ...
  // ]
  POINTS = 1,
  // [
  //    [KEY1, VALUE1, VALUE2, ...],
  //    [KEY2, VALUE1, VALUE2, ...]
  // ]
  TABLE = 2,
  // {keyId: []}
  RAW = 3,
  // {linkName: {linkDirection: {keyName: [], shortName: []}}}
  RAW_LINK = 4,
  // {nodeName: {keyName: [], shortName: []}}
  RAW_NODE = 5,
  // event data grouped by link
  EVENT_LINK = 10,
  // event data grouped by node
  EVENT_NODE = 11,
}
// aggregate across all values in the graph
enum GraphAggregation {
  // perform no aggregation, return all data points
  NONE = 1,
  // return only the latest data-point
  LATEST = 2,
  AVG = 10,
  COUNT = 15,
  SUM = 20,
  // Used in conjunction with limiting the results
  /* NOT IMPLEMENTED */
  TOP_AVG = 30,
  TOP_MIN = 31,
  TOP_MAX = 32,
  /* NOT IMPLEMENTED */
  BOTTOM_AVG = 40,
  BOTTOM_MIN = 41,
  BOTTOM_MAX = 42,

  LINK_STATS = 100,
}
/**
 * Request for a single graph.
 * EX:
 *    keyNames=["snr"], restrictors=[{restrictorType=LINK, values=["link-NodeA-NodeB"]}], outputFormat=POINTS, minAgo=10
 */
struct QueryRequest {
  1: string topologyName,
  // list of key names - ["snr"] or ["tgf.MAC1.ssnrEst", "tgf.MAC2.ssnrEst"]
  2: list<string> keyNames,
  // aggregate the collection of all keys
  3: GraphAggregation aggregation = GraphAggregation.NONE,
  // maximum results to return
  4: optional i32 maxResults = 10,
  // maximum data points to return
  // average values between points
  5: optional i32 maxDataPoints = 0,
  // restrict key names to those matching these restrictors
  // the restrictors are stacked
  10: optional list<QueryRestrictor> restrictors,
  // format to output the results in
  20: StatsOutputFormat outputFormat = StatsOutputFormat.POINTS,
  // expected counter increase per second
  21: optional double countPerSecond = 39,
  // time selection
  100: optional i32 minAgo,
  101: optional i64 startTsSec,
  102: optional i64 endTsSec,
  // source data to query from
  110: i32 dsIntervalSec = 30,
  // output debug data to console for this request
  1000: optional bool debugLogToConsole = false,
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
  1: i64 startTime,
  2: i64 endTime,
  3: string description,
  4: optional LinkStateType linkState,
}

struct EventList {
  // percentage - link is in LINK_UP or LINK_UP_DATADOWN (heartbeats going)
  1: double linkAlive,
  2: list<EventDescription> events,
  // percentage - link is in LINK_UP - capable of passing data packets
  3: optional double linkAvailForData,
}

struct OutputFormatEvents {
  1: i64 startTime,
  2: i64 endTime,
  3: map<string /* key name */, EventList> events,
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
