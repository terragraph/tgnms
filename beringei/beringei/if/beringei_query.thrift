/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

include "beringei/if/Topology.thrift"
include "beringei/if/Event.thrift"

namespace cpp2 facebook.gorilla.query
namespace py facebook.gorilla.beringei_query

enum KeyUnit {
  // no scaling
  NONE = 0,
  // no scaling, range [0,100]
  PERC = 1,
  // assume data in bytes/sec, will convert to bits/sec
  BYTES_PER_SEC,
}

struct KeyData {
  1: i64 keyId,
  2: string key,
  3: KeyUnit unit,

  10: string displayName,
  11: optional string linkName,
  // extra title for link
  12: optional string linkTitleAppend,

  20: optional string node,
  21: optional string nodeName,

  30: optional string siteName,
}

struct Query {
  1: string type,
  2: list<i64> key_ids,
  3: list<KeyData> data,
  4: optional i32 min_ago,
  5: string agg_type,

  // period to search (unixtime)
  10: i64 start_ts,
  11: i64 end_ts,
  // beringei time series interval in seconds
  20: i32 interval = 30,
}

struct TypeAheadRequest {
  1: string topologyName,
  2: string input,
  // TODO - site/node restrictions
}

struct TableQuery {
  1: string name,
  // event, event_sec..?
  2: string type,
  // e.g. fw_uptime
  3: string metric,
  // restrict by link name
  4: optional string linkNameRestrictor,

  10: i64 start_ts,
  11: i64 end_ts,
  // use over start/end if set
  12: optional i32 min_ago,
  // beringei time series interval in seconds
  20: i32 interval = 30,
}

struct TableQueryRequest {
  1: string topologyName,
  // no distinction between node/link queries yet
  10: list<TableQuery> nodeQueries,
  11: list<TableQuery> linkQueries,
}

struct EventsQueryRequest {
  1: string topologyName,
  2: i64 timestamp,
  3: i32 maxResults = 100,
  4: string category,
  5: string level,
  6: string subcategory,
}

struct QueryRequest {
  1: list<Query> queries,
}

struct Stat {
  1: string key,
  2: i64 ts,
  3: double value,
}

struct Log {
  1: i64 ts, /* Timestamp in us */
  2: string file, /* Filename */
  3: string log, /* Log line */
}

struct NodeStates {
  1: string mac,
  2: string name,
  3: string site,
  4: list<Stat> stats,
}

struct NodeLogs {
  1: string mac,
  2: string name,
  3: string site,
  4: list<Log> logs,
}

struct NodeEvents {
  1: string mac,
  2: string name,
  3: string site,
  4: list<Event.Event> events,
}

struct ControllerConfig {
  1: string ip,
  2: i32 api_port,
}

struct WirelessController {
  1: string url,
  2: string type,
  10: string username,
  11: string password,
}

struct TopologyConfig {
  1: i32 id,
  10: string name,

  100: ControllerConfig primary_controller,
  110: optional ControllerConfig backup_controller,

  200: optional Topology.Topology topology,
  // Aggregate stat keys for the network
  300: optional map<string, i64> keys,

  // Wireless Access Controller
  400: optional WirelessController wireless_controller,
}

struct WirelessControllerStatsRequest {
  1: string topologyName,
}

struct StatsWriteRequest {
  1: Topology.Topology topology,
  2: list<NodeStates> agents,
  3: i32 interval = 30, /* In seconds */
}

struct LogsWriteRequest {
  1: Topology.Topology topology,
  2: list<NodeLogs> agents,
}

struct EventsWriteRequest {
  1: Topology.Topology topology,
  2: list<NodeEvents> agents,
}

struct MySqlNodeData {
  1: i64 id,
  2: string node,
  3: string mac,
  4: string network,
  5: string site,
  6: map<i64, string> keyList,
}

struct MySqlEventData {
  1: string sample,
  2: i64 timestamp,
  3: i64 category_id,
}

struct AlertsWriteRequest {
  1: i64 timestamp,
  2: string node_mac,
  3: string node_name,
  4: string node_site,
  5: string node_topology,
  6: string alert_id,
  7: string alert_regex,
  8: double alert_threshold,
  9: string alert_comparator,
  10: string alert_level,
  11: string trigger_key,
  12: double trigger_value,
}

struct MySqlAlertData {
  1: i64 node_id,
  2: i64 timestamp,
  3: string alert_id,
  4: string alert_regex,
  5: double alert_threshold,
  6: string alert_comparator,
  7: string alert_level,
  8: string trigger_key,
  9: double trigger_value,
}

// Data structure to request raw time series data from BQS
// RawQueryKey carries the unique combination to identify a time series
// There are two ways to identify the needed metric key string:
// a. using sourceMac, peerMac and keyName
// b. or debugging <optional> using the Beringei keyId of the time series
// BQS finds the right series by:
// if keyId is filled, use option b
// else use option a
struct RawQueryKey {
  // sourceMac address, needs to be filled
  1: optional string sourceMac,
  // peerMac address, can be filled for link stats like ssnrEst
  // for node type stats, like iftemperature, not filled
  2: optional string peerMac,
  // name of the key, like "staPkt.txPowerIndex" or "phystatus.snrEst"
  3: optional string metricName,
  // topologyName is used to find the right keyId holding client
  4: optional string topologyName,
  // The keyId of the time series in Beringei database
  5: optional i64 keyId,
}

struct RawReadQuery {
  1: list<RawQueryKey> queryKeyList,
  // period to search (unixtime in second)
  2: i64 startTimestamp,
  3: i64 endTimestamp,
  // Beringei time series interval in seconds
  4: i32 interval = 30,
}

struct RawReadQueryRequest {
  1: list<RawReadQuery> queries,
}

// UnifiedWriteRequest is used to carry the write requests for both node (link)
// stats and aggregate stats. The aggregate stats can be
// used for network wide insight writing to Beringei database.
struct UnifiedWriteRequest {
  1: list<i32> intervals, /* Target Beringei database interval in seconds */
  2: optional list<NodeStats> nodeStats,
  3: optional list<AggStats> aggStats,
}

struct NodeStats {
  1: string mac,
  2: list<Stat> stats,
}

struct AggStats {
  1: string topologyName,
  2: list<Stat> stats,
}

struct StatsWriteResponse {
  1: bool success,
  2: optional string error,
}
