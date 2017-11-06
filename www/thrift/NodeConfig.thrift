namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.NodeConfig

include "FwOptParams.thrift"

struct SystemParams {
  1: bool managedConfig;
}

struct NodeEnvParams {
  1: optional string OPENR_ENABLED;
  2: optional string OPENR_ALLOC_PREFIX;
  3: optional string OPENR_USE_RTT_METRIC;
  4: optional string OPENR_USE_FIB_NSS;
  5: optional string FW_NSS;
  6: optional string OPENR_USE_FIB_LINUX;
  7: optional string OOB_NETNS;
  8: optional string OOB_INTERFACE;
  9: optional string CPE_INTERFACE;
  10: optional string E2E_ENABLED;
  11: optional string FW_IF2IF;
  12: optional string TOPOLOGY_FILE;
  13: optional string SYSTEM_LOGS_ENABLED;
}

struct LogTailSource {
  1: bool enabled;
  2: string filename;
}

struct LogTailParams {
  1: map<string, LogTailSource> sources;
}

struct StatsAgentSource {
  1: bool enabled;
  2: string zmq_url;
}

struct StatsAgentParams {
  1: map<string, StatsAgentSource> sources;
}

struct NodeConfig {
  1: NodeEnvParams envParams;
  2: FwOptParams.NodeFwParams fwParams;
  3: LogTailParams logTailParams;
  4: StatsAgentParams statsAgentParams;
  5: SystemParams sysParams;
}
