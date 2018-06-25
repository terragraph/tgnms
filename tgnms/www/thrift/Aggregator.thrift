namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Aggregator

cpp_include "<unordered_map>"

include "Monitor.thrift"

enum AggrMessageType {

  // ===  StatusApp  === //
  // Requests handled (by Aggr StatusApp)
  GET_STATUS_DUMP = 101,
  // Responses given (by Aggr StatusApp)
  STATUS_DUMP = 201,

  // === StatsApp === //
  GET_ALERTS_CONFIG = 501,
  GET_ALERTS_CONFIG_RESP = 502,
  SET_ALERTS_CONFIG = 503,
  SET_ALERTS_CONFIG_RESP = 504,

  // === NmsPublisher === //
  // Messages originated (by agent)
  STATS_REPORT = 402,
  HIGH_FREQUENCY_STATS_REPORT = 403,

  // === LogTail === //
  // Messages originated (by logtail)
  SYSLOG_REPORT = 451,

  // === PerfTest === //
  // Messages originated (by perf)
  PING = 301,
  // Messages received (from StatsApp)
  PONG = 302,

  // ===  ConfigApp  === //
  GET_AGGR_CONFIG_REQ = 601,
  GET_AGGR_CONFIG_RESP = 602,
  SET_AGGR_CONFIG_REQ = 603,
  GET_AGGR_CONFIG_METADATA_REQ = 604,
  GET_AGGR_CONFIG_METADATA_RESP = 605,

  // Common
  AGGR_ACK = 1001,
  GET_TOPOLOGY = 1002,
  TOPOLOGY = 1003,
}

#############  StatusApp ##############

/**
 * @apiDefine AggrGetStatusDump
 */
struct AggrGetStatusDump {}

/**
 * @apiDefine AggrStatusDump_SUCCESS
 * @apiSuccess {String} [version]
 *             The aggregator version sourced from "/etc/version"
 */
struct AggrStatusDump {
  // deprecated: 1 (adjacencyMap), 2 (statusReports)
  3: optional string version;
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

struct AggrGetTopology {}

struct AggrPing {
  1: i64 clientTs;
}

struct AggrPong {
  1: i64 clientTs;
}

############# Config App #############

struct AggregatorConfig {
  1: map<string, string> (cpp.template = "std::unordered_map") flags;
}

/**
 * @apiDefine AggrGetConfigReq
 */
struct AggrGetConfigReq {}

/**
 * @apiDefine AggrGetConfigResp_SUCCESS
 * @apiSuccess {String} config The aggregator config (JSON)
 */
struct AggrGetConfigResp {
  1: string config; // Json of aggregator config
}

/**
 * @apiDefine AggrSetConfigReq
 * @apiParam {String} config The aggregator config (JSON)
 */
struct AggrSetConfigReq {
  1: string config; // Json of aggregator config
}

/**
 * @apiDefine AggrGetConfigMetadata
 */
struct AggrGetConfigMetadata {}

/**
 * @apiDefine AggrGetConfigMetadataResp_SUCCESS
 * @apiSuccess {String} metadata The aggregator config parameter metadata (JSON)
 */
struct AggrGetConfigMetadataResp {
  1: string metadata;
}

############# Common #############

struct AggrMessage {
  1: AggrMessageType mType;
  2: binary value;
  3: optional bool compressed;
  4: optional AggrCompressionFormat compressionFormat;
}

enum AggrCompressionFormat {
  SNAPPY = 1,
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
