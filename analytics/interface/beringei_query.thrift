/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

include "Topology.thrift"

// Disable the cpp since Apache Thrift is used here
// TODO: find the right version of Thrift so that we can merge the Thrift here
//       and the one under beringei/if
// namespace cpp2 facebook.gorilla
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

struct QueryRequest {
  1: list<Query> queries,
}

struct Stat {
  1: string key,
  2: i64 ts,
  3: double value,
}

struct Event {
  1: string category,
  2: i64 ts, /* Timestamp in us */
  3: string sample,
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
  4: list<Event> events,
}

struct TopologyConfig {
  1: i32 id,
  10: string name,
  20: double initial_latitude,
  21: double initial_longitude,
  22: i32 initial_zoom_level,

  100: string e2e_ip,
  101: i32 e2e_port,
  110: string api_ip,
  111: i32 api_port,

  200: optional Topology.Topology topology,
  // aggregate stat keys for the network
  300: optional map<string, i64> keys,
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
  3: string mac,
  4: string network,
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
// a. using source_mac, <optional> peer_mac and key_name
// b. or debugging <optional> using the Beringei key_id of the time series
// BQS finds the right series by:
// if key_id is filled, use option b
// else use option a
struct RawQueryKey {
  // source_mac address, needs to be filled
  1: optional string sourceMac,
  // peer_mac address, can be filled for link stats like ssnrEst
  // for node type stats, like iftemperature, not filled
  2: optional string peerMac,
  // name of the key, like "staPkt.txPowerIndex" or "phystatus.snrEst"
  3: optional string metricName,
  // topology_name is used to find the right key_id holding client
  4: optional string topologyName,
  // The key_id of the time series in Beringei database
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
