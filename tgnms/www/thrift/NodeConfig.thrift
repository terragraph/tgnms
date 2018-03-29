namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.NodeConfig

include "FwOptParams.thrift"

struct SystemParams {
  1: bool managedConfig;
}

struct NodeEnvParams {
  // Definition:
  // Values:
  // Default:
  1: optional string OPENR_ENABLED;

  // Definition:
  // Values:
  // Default:
  2: optional string OPENR_ALLOC_PREFIX;

  // Definition:
  // Values:
  // Default:
  3: optional string OPENR_USE_RTT_METRIC;

  // Definition:
  // Values:
  // Default:
  4: optional string OPENR_USE_FIB_NSS;

  // Definition:
  // Values:
  // Default:
  5: optional string OOB_NETNS;

  // Definition:
  // Values:
  // Default:
  6: optional string OOB_INTERFACE;

  // Definition:
  // Values:
  // Default:
  7: optional string CPE_INTERFACE;

  // Definition:
  // Values:
  // Default:
  8: optional string E2E_ENABLED;

  // Definition:
  // Values:
  // Default:
  9: optional string FW_IF2IF;

  // Definition:
  // Values:
  // Default:
  10: optional string OPENR_DOMAIN;

  // Definition:
  // Values: bitmap=bit0,bit1,...,7
  //                0:ENABLE_SYNC,
  //                  QUEUE_DESC,
  //                  ENABLE_POLL,
  //                  STAT_RD,
  //                  NMEA_CFG_PRSR,
  //                  CFG_RSP_PARSED,
  //                  CFG_RSP_RAW,
  //                  UBLX_WARNING
  // Default: 0
  11: optional string FB_DRIVER_VERBOSE;

  // Definition:
  // Values: 0=+error
  //         1=+hli
  //         2=+bh
  //         3=+inform,+trace
  // Default: 0
  12: optional string HMAC_VERBOSE;

  // Definition:
  // Values: 0=+error,+bh
  //         1=+inform
  //         2=+trace
  //         3=+prhdrs,+prpkt
  // Default:
  13: optional string KMOD_VERBOSE;
}

struct PopConfigParams {
  // Definition:
  // Values:
  // Default:
  1: optional string POP_ADDR;

  // Definition:
  // Values:
  // Default:
  2: optional string POP_IFACE;

  // Definition:
  // Values:
  // Default:
  3: optional string POP_STATIC_ROUTING;

  // Definition:
  // Values:
  // Default:
  4: optional string POP_BGP_ROUTING;

  // Definition:
  // Values:
  // Default:
  5: optional string GW_ADDR;
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
  6: optional map<string,string> kvstoreParams;
  7: PopConfigParams popParams;
}
