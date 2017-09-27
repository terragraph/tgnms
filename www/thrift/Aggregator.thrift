namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Aggregator

include "Lsdb.thrift"
include "IpPrefix.thrift"
include "Monitor.thrift"

enum AggrMessageType {

  // ===  StatusApp  === //
  // Requests handled (by Aggr StatusApp)
  GET_STATUS_DUMP = 101,
  GET_ROUTING_ADJ = 102,
  // Responses given (by Aggr StatusApp)
  STATUS_DUMP = 201,
  ROUTING_ADJ = 202,
  // Messages originated (by agent)
  STATUS_REPORT = 401,
  STATS_REPORT = 402,
  // Messages originated (by logtail)
  SYSLOG_REPORT = 451,

  GET_ALERTS_CONFIG = 501,
  GET_ALERTS_CONFIG_RESP = 502,
  SET_ALERTS_CONFIG = 503,
  SET_ALERTS_CONFIG_RESP = 504,

  // ===  TrafficApp  === //
  START_IPERF = 601,
  START_IPERF_SERVER = 602,
  START_IPERF_CLIENT = 603,
  STOP_IPERF = 604,
  GET_IPERF_STATUS = 605,
  IPERF_STATUS_REPORT = 606,

  // Common
  AGGR_ACK = 1001,
}

#############  StatusApp ##############

struct AggrGetStatusDump {}

struct AggrStatusDump {
  1: map<string /* node id */, Lsdb.AdjacencyDatabase> adjacencyMap;
  2: map<string /* node id */, AggrStatusReport> statusReports;
}

struct AggrStatusReport {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: string ipv6Address;
  3: list<IpPrefix.UnicastRoute> routes;
  4: map<string /* interface */, string /* address */> linkLocals;
}

#############  StatsApp ##############

struct AggrStat {
  1: string key;
  2: i64 timestamp;
  3: double value;
  4: bool is_counter;
}

struct AggrStatsReport {
  1: list<AggrStat> stats;
  2: list<Monitor.EventLog> events;
}

enum AggrAlertComparator {
  ALERT_GT  = 0,
  ALERT_GTE = 1,
  ALERT_LT  = 2,
  ALERT_LTE = 3,
}

enum AggrAlertLevel {
  ALERT_INFO  = 0,
  ALERT_WARNING = 1,
  ALERT_CRITICAL  = 2,
}

struct AggrAlertConf {
  1: string id;
  2: string key;
  3: double threshold;
  4: AggrAlertComparator comp;
  5: AggrAlertLevel level;
  6: optional string node_mac;
}

struct AggrAlertConfList {
  1: list<AggrAlertConf> alerts;
}

struct AggrSetAlertsConfigResp {
  1: bool success;
}

struct AggrSyslog {
  1: i64 timestamp;
  2: string index;
  3: string log;
}

struct AggrSyslogReport {
  1: string mac_addr;
  2: list<AggrSyslog> syslogs;
}

############# TrafficApp ##############

struct AggrStartIperf {
  1: string src_node_id;
  2: string src_node_ipv6;
  3: string dst_node_id;
  4: string dst_node_ipv6;
  5: i64 bitrate;
  6: i32 time_sec;
}

struct AggrStartAgentIperfServer {
  1: i32 server_port;
}

struct AggrStartAgentIperfClient {
  1: string server_ipv6_address;
  2: i32 server_port;
  3: i64 bitrate;
  4: i32 time_sec;
}

struct AggrStopIperf {
  1: string node_id;
}

struct AggrStopAgentIperf {}

struct AggrGetIperfStatus {
  1: string node_id;
}

struct AggrIperfStatusReport {
  1: map<i32, AggrStartAgentIperfClient> clients;
  2: map<i32, AggrStartAgentIperfServer> servers;
}

############# Common #############

struct AggrMessage {
  1: AggrMessageType mType;
  2: binary value;
}

// Ack to asynchronous requests
struct AggrAck {
  1: bool success;
  2: string message;
}
