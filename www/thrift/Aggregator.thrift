namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Aggregator

include "Lsdb.thrift"
include "IpPrefix.thrift"
include "Monitor.thrift"

enum AggrMessageType {

  // ===  StatusApp  === //
  // Requests handled (by Aggr StatusApp)
  GET_STATUS_DUMP_DEPRECATED = 101,
  GET_STATUS_REPORT = 103,
  GET_ROUTING_REPORT = 104,
  // Responses given (by Aggr StatusApp)
  STATUS_DUMP_DEPRECATED = 201,
  ROUTING_ADJ = 202,
  // Messages originated (by agent)
  STATUS_REPORT_DEPRECATED = 401, // Deprecating
  STATUS_REPORT = 403,
  ROUTING_REPORT = 404,

  STATS_REPORT = 402,
  // Messages originated (by logtail)
  SYSLOG_REPORT = 451,

  GET_ALERTS_CONFIG = 501,
  GET_ALERTS_CONFIG_RESP = 502,
  SET_ALERTS_CONFIG = 503,
  SET_ALERTS_CONFIG_RESP = 504,

  // ===  TrafficApp  === //
  // Requests handled (by Aggr TrafficApp)
  START_IPERF = 601,
  STOP_IPERF = 602,
  GET_IPERF_STATUS = 603,
  // Messages originated by Aggr TrafficApp to agent / NmsPublisher
  START_IPERF_SERVER = 611,
  START_IPERF_CLIENT = 612,
  // Messages originated by agent to Aggr TrafficApp
  START_IPERF_SERVER_RESP = 621,
  IPERF_STATUS_REPORT = 622,

  // Common
  AGGR_ACK = 1001,
}

#############  StatusApp ##############

/**
 * @apiDefine AggrGetStatusDump
 * @apiDeprecated Data became too large, use
                  AggrGetStatusReports/AggrGetRoutingReports
 */
struct AggrGetStatusDump {}

/**
 * @apiDefine AggrStatusDump_SUCCESS
 * @apiDeprecated Data became too large, use
                  AggrStatusReports/AggrRoutingReports
 * @apiSuccess {Map(String:Object(AdjacencyDatabase))} adjacencyMap
 *             The per-node adjacency map
 * @apiSuccess {Map(String:Object(AggrStatusReport))} statusReports
 *             The per-node status reports
 */
struct AggrStatusDump_Deprecated {
  1: map<string /* node id */, Lsdb.AdjacencyDatabase> adjacencyMap;
  2: map<string /* node id */, AggrStatusReport_Deprecated> statusReports;
}

/**
 * Status Reports
 */

struct AggrGetStatusReport {}

struct AggrStatusReport {
  1: map<string /* node id */, AgentStatusReport> statusReports;
}

struct AgentStatusReport {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: string ipv6Address;
}

/**
 * @apiDefine AggrStatusReport_Deprecated_SUCCESS
 * @apiSuccess (:AggrStatusReport) {Int64} timeStamp
 *                                 The time at which this response was generated
 * @apiSuccess (:AggrStatusReport) {String} ipv6Address The globally-reachable
 *                                 IPv6 address of the stats agent
 * @apiSuccess (:AggrStatusReport) {Object(UnicastRoute)[]} routes
 *                                 The routing table
 * @apiSuccess (:AggrStatusReport) {Map(String:String)} linkLocals
 *                                 The link-locals addresses (interface:address)
 */
struct AggrStatusReport_Deprecated {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: string ipv6Address;
  3: list<IpPrefix.UnicastRoute> routes;
  4: map<string /* interface */, string /* address */> linkLocals;
}

struct AggrGetRoutingReport {}

struct AggrRoutingReport {
  1: map<string /* node id */, Lsdb.AdjacencyDatabase> adjacencyMap;
  2: map<string /* node id */, AgentRoutingReport> routingReports;
}

struct AgentRoutingReport {
  1: list<IpPrefix.UnicastRoute> routes;
  2: map<string /* interface */, string /* address */> linkLocals;
}

#############  StatsApp ##############

struct AggrStat {
  1: string key;
  2: i64 timestamp;
  3: double value;
  4: bool isCounter;
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
  6: optional string nodeMac;
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
  1: string macAddr;
  2: list<AggrSyslog> syslogs;
}

############# TrafficApp ##############

// Protocol numbers:
// https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
enum AggrIperfTransportProtocol {
  TCP = 6,
  UDP = 17,
}

/**
 * @apiDefine AggrStartIperf
 * @apiParam {String} srcNodeId The source node MAC address
 * @apiParam {String} srcNodeIpv6 The source node IPv6 address
 * @apiParam {String} dstNodeId The destination node MAC address
 * @apiParam {String} dstNodeIpv6 The destination node IPv6 address
 * @apiParam {Int64} bitrate The target traffic bitrate (bps)
 * @apiParam {Int32} timeSec The measurement duration (in seconds)
 * @apiParam {Int(AggrIperfTransportProtocol)=6,17} protocol
 *           The transport protocol (6=TCP, 17=UDP)
 */
/**
 * @apiDefine AggrStartIperf_SUCCESS
 * @apiSuccess (:AggrStartIperf) {String} srcNodeId
 *                               The source node MAC address
 * @apiSuccess (:AggrStartIperf) {String} srcNodeIpv6
 *                               The source node IPv6 address
 * @apiSuccess (:AggrStartIperf) {String} dstNodeId
 *                               The destination node MAC address
 * @apiSuccess (:AggrStartIperf) {String} dstNodeIpv6
 *                               The destination node IPv6 address
 * @apiSuccess (:AggrStartIperf) {Int64} bitrate
 *                               The target traffic bitrate (bps)
 * @apiSuccess (:AggrStartIperf) {Int32} timeSec
 *                               The measurement duration (in seconds)
 * @apiSuccess (:AggrStartIperf) {Int(AggrIperfTransportProtocol)=6,17} protocol
 *                               The transport protocol (6=TCP, 17=UDP)
 */
struct AggrStartIperf {
  1: string srcNodeId;
  2: string srcNodeIpv6;
  3: string dstNodeId;
  4: string dstNodeIpv6;
  5: i64 bitrate;
  6: i32 timeSec;
  7: AggrIperfTransportProtocol protocol;
}

/**
 * @apiDefine AggrStartAgentIperf_SUCCESS
 * @apiSuccess (:AggrStartAgentIperf) {Object(AggrStartIperf)} iperfConfig
 *                                    The iperf config
 * @apiSuccess (:AggrStartAgentIperf) {Int32} serverPort The server port
 */
struct AggrStartAgentIperf {
  1: AggrStartIperf iperfConfig;
  2: i32 serverPort = 0;
}

/**
 * @apiDefine AggrStopIperf
 * @apiParam {String} nodeId The node MAC address
 */
struct AggrStopIperf {
  1: string nodeId;
}

struct AggrStopAgentIperf {}

/**
 * @apiDefine AggrGetIperfStatus
 * @apiParam {String} nodeId The node MAC address
 */
struct AggrGetIperfStatus {
  1: string nodeId;
}

/**
 * @apiDefine AggrIperfStatusReport_SUCCESS
 * @apiSuccess {Map(Int32:Object(AggrStartAgentIperf))} clients
 *             The client statuses, keyed by iperf port
 * @apiSuccess {Map(Int32:Object(AggrStartAgentIperf))} servers
 *             The server statuses, keyed by iperf port
 */
struct AggrIperfStatusReport {
  1: map<i32 /* port */, AggrStartAgentIperf> clients;
  2: map<i32 /* port */, AggrStartAgentIperf> servers;
}

############# Common #############

struct AggrMessage {
  1: AggrMessageType mType;
  2: binary value;
}

/**
 * @apiDefine AggrAck_SUCCESS
 * @apiSuccess {Boolean} success The response status
 * @apiSuccess {String} message The response message
 */
// Ack to asynchronous requests
struct AggrAck {
  1: bool success;
  2: string message;
}
