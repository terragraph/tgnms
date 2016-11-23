namespace cpp2 facebook.terragraph.thrift
namespace php CXL_Terragraph
namespace py terragraph_thrift.Controller

include "BWAllocation.thrift"
include "Topology.thrift"

enum MessageType {

  // ===  StatusApp  === //
  // Requests handled (by Ctrl StatusApp)
  GET_STATUS_DUMP = 101,
  // Responses given (by Ctrl StatusApp)
  STATUS_DUMP = 121,
  // Requests handled (by Minion StatusApp)
  SET_NODE_PARAMS = 141,
  // Messages originated (by Minion StatusApp)
  STATUS_REPORT = 161,

  // ===  IgnitionApp  === //
  // Requests handled (by Ctrl IgnitionApp)
  GET_IGNITION_STATE = 201,
  SET_IGNITION_PARAMS = 202,
  SET_LINK_STATUS_REQ = 203,
  // Responses given (by Ctrl IgnitionApp)
  IGNITION_STATE = 221,
  // Requests handled (by Minion IgnitionApp)
  SET_LINK_STATUS = 241,
  // Messages originated (by Minion IgnitionApp)
  LINK_STATUS = 261,

  // ===  TopologyApp  === //
  // Requests handled (by Ctrl TopologyApp)
  GET_TOPOLOGY = 301,
  SET_NODE_STATUS_REQ = 302,
  SET_NODE_MAC_REQ = 303,
  SET_NODE_PARAMS_REQ = 304,
  // Responses given (by Ctrl TopologyApp)
  TOPOLOGY = 321,

  // ===  UpgradeApp  === //
  // Requests handled (by minion UpgradeApp)
  UPGRADE_REQ = 401,
  // Messages originated (by minion UpgradeApp)
  SET_UPGRADE_STATUS = 421,

  // ===  KvStoreClientApp  === //
  SET_CTRL_PARAMS = 501,

  // Message exchange with driver
  DR_SET_GPS_POS = 41,

  // Message exchanges with firmware
  NODE_INIT = 51,
  NODE_INIT_NOTIFY = 52,
  DR_SET_LINK_STATUS = 55,
  DR_SET_LINK_STATUS_ACK = 56,
  DR_LINK_STATUS = 57,
  DISSOC_RESPONSE = 58,
  DISSOC_NOTIFY = 59,
  FW_SET_NODE_PARAMS = 60,
  DR_SET_NODE_PARAMS_ACK = 61,
  FW_SET_NODE_PARAMS_ACK = 62,
  FW_STATS = 63,
  FW_STATS_CONFIGURE_REQ = 64,
  FW_STATS_CONFIGURE_RESP = 65,
  FW_STATS_CONFIGURE_NOTIFY = 66,
  PHY_LA_LOOKUP_CONFIG_REQ = 67,
  PHY_LA_LOOKUP_CONFIG_RESP = 68,
  PHY_LA_LOOKUP_CONFIG_NOTIFY = 69,
  GPS_ENABLE_REQ = 70,
  GPS_ENABLE_RESP = 71,
  GPS_ENABLE_NOTIFY = 72,

  // Miscellaneous (common)
  NONE = 1001,
  HELLO = 1002,
  E2E_ACK = 1003,
  TEST = 1004,
}

// link update action type
enum LinkActionType {
  LINK_UP = 1,
  LINK_DOWN = 2,
  LINK_ADD = 3,
  LINK_DELETE = 4,
}

// link status type used in e2e scope
enum LinkStatusType {
  LINK_UP = 1,
  LINK_DOWN = 2,
}

############# Upgrade App #############

enum UpgradeStatusType {
  NONE = 10,
  DOWNLOADING_IMAGE = 20,
  DOWNLOAD_FAILED = 30,
  FLASHING_IMAGE = 40,
  FLASH_FAILED = 50,
  READY_TO_REBOOT = 60,
}

// terragraph image meta struct
struct ImageMeta {
  1: string md5; // image md5
  2: string version; // image version
}

struct UpgradeStatus {
  1: UpgradeStatusType usType;
  2: ImageMeta nextImage;
  3: string reason;
}

enum UpgradeReqType {
  PREPARE_UPGRADE = 10,
  COMMIT_UPGRADE = 20,
}

// Upgrade request from viper to UpgradeApp
struct UpgradeReq {
  1: string imageUrl; // image url the minion uses to upgrade
  2: string md5; // expected md5 checksum for downloaded image from server
  3: UpgradeReqType urType;
}

#############  StatusApp ##############

struct GetStatusDump {}

struct StatusDump {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: map<string /* node id */, StatusReport> statusReports;
}

// Node parameters configured on each node.
struct NodeParams {
  1: optional BWAllocation.BwAllocationMap bwAllocMap;
}

struct StatusReport {
  1: i64 timeStamp;  // timestamp at which this response was received
  2: string ipv6Address;  // global-reachable IPv6 address for minion
  3: string version; // current minion version obtained from "/etc/version"
  4: bool isConnected; // whether minion is connected to the rest of network
  5: UpgradeStatus upgradeStatus;
}

#############  IgnitionApp ##############

struct GetIgnitionState {}

// Parameters controlling the ignition in the controller
struct IgnitionParams {
  1: optional bool enable;  // enable auto-ignition from the controller
  2: optional i64 linkUpInterval;  // set frequency of ignition
}

// Set Link Status Request sent from bb8 to controller ignition app
// instructs controller to send a SetLinkStatus msg to initiator node
struct SetLinkStatusReq {
  1: LinkActionType action; // link update action (up/down)
  2: string initiatorNodeName;
  3: string responderNodeName;
}

struct IgnitionCandidate {
  1: string initiatorNodeName;
  2: string linkName;
}

struct IgnitionState {
  1: list<string> visitedNodeNames;
  2: list<IgnitionCandidate> igCandidates;
  3: IgnitionCandidate lastIgCandidate;
}

// Set Link Status message sent from controller to minion on node
// instructs initiator node to perfrom link association / dissociation
// controller expects to receive Link Status message after this request
struct SetLinkStatus {
  1: LinkStatusType linkStatusType; // whether it's link up or link down
  2: string responderMac; // mac address of the responder node
  3: Topology.NodeType responderNodeType; // populate with neighbor's node role
}

// Link Status message sent from minion (initiator/responder) to controller
// indicates link status change: LINK_UP / LINK_DOWN (LINK_PAUSE)
struct LinkStatus {
  1: string responderMac; // mac address of the other end of link
  2: LinkStatusType linkStatusType; // whether link is up or down
}

#############  TopologyApp ##############

struct GetTopology {}

struct SetNodeStatusReq {
  1: string nodeMac;
  2: bool markAllLinksDown;
  3: bool markNodeDown;
}

struct SetNodeParamsReq {
  1: string nodeMac;
  2: optional NodeParams nodeParams;
}

struct SetNodeMacReq {
  1: string nodeName;
  2: string scannedBlob; // raw scanned data
}

############# KvStoreClient App #############

// set controller url request sent from kvstore client app to minion broker
struct SetCtrlParams {
  1: string ctrlUrl; // controller url
}

############# DriverIf #############

// Firmware configuration parameters
struct FwOptParams {
  1:  optional i64 antCodeBook;
  2:  optional i64 polarity;
  3:  optional i64 frameConfig;
  4:  optional i64 numOfPeerSta;
  5:  optional i64 logModules;
  6:  optional i64 logSeverity;
  7:  optional i64 gpioConfig;
  8:  optional i64 channel;
  9:  optional i64 swConfig;
  10: optional i64 mcs;
  11: optional i64 txPower;
  12: optional i64 rxBuffer
  13: optional i64 beamConfig;
  14: optional i64 txBeamIndex;
  15: optional i64 rxBeamIndex;
  16: optional i64 statsType;
  17: optional i64 dataCollectionType;
  18: optional i64 numOfHbLossToFail;
  19: optional i64 statsLogInterval;
  20: optional i64 statsPrintInterval;
  21: optional i64 forceGpsDisable;
  22: optional i64 lsmAssocRespTimeout;
  23: optional i64 lsmSendAssocReqRetry;
  24: optional i64 lsmAssocRespAckTimeout;
  25: optional i64 lsmSendAssocRespRetry;
  26: optional i64 lsmRepeatAckInterval;
  27: optional i64 lsmRepeatAck;
  28: optional i64 lsmFirstHeartbTimeout;
  29: optional i64 txSlot0Start;
  30: optional i64 txSlot0End;
  31: optional i64 txSlot1Start;
  32: optional i64 txSlot1End;
  33: optional i64 txSlot2Start;
  34: optional i64 txSlot2End;
  35: optional i64 rxSlot0Start;
  36: optional i64 rxSlot0End;
  37: optional i64 rxSlot1Start;
  38: optional i64 rxSlot1End;
  39: optional i64 rxSlot2Start;
  40: optional i64 rxSlot2End;
  41: optional i64 gpsTimeout;
  42: optional i64 linkAgc;
  43: optional i64 respNodeType;
}

// Firmware configuration parameters for a node
struct NodeFwParams {
  // optional parameters for node init
  1: FwOptParams nodeInitOptParams;
  // optional parameters for a link incident with this node
  2: FwOptParams linkOptParams;
}

############# Common #############

struct Message {
  1: MessageType mType;
  2: binary value;
}

// hello message send/reply by both sides for confirmation of established
// communication channel
struct Hello {}

// Ack to asynchronous requests
struct E2EAck {
  1: bool success;
  2: string message;
}
