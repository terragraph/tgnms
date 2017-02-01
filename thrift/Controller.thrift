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
  SET_NODE_STATUS = 302,
  SET_NODE_MAC = 303,
  SET_NODE_PARAMS_REQ = 304,
  BUMP_LINKUP_ATTEMPTS = 305,
  ADD_NODE = 306,
  ADD_LINK = 307,
  DEL_NODE = 308,
  DEL_LINK = 309,
  ADD_SITE = 310,
  DEL_SITE = 311,
  // Responses given (by Ctrl TopologyApp)
  TOPOLOGY = 321,

  // ===  UpgradeApp  === //
  // Requests handled (by minion UpgradeApp)
  UPGRADE_REQ = 401,
  // Messages originated (by minion UpgradeApp)
  SET_UPGRADE_STATUS = 421,

  // ===  KvStoreClientApp  === //
  SET_CTRL_PARAMS = 450,

  // === DriverApp === //
  // Message exchange with driver
  DR_ACK = 491,

  // Message exchange with firmware
  // south bound
  NODE_INIT = 501,
  DR_SET_LINK_STATUS = 502,  // link up/link down request
  FW_SET_NODE_PARAMS = 503,  // set bandwidth allocation map
  FW_STATS_CONFIGURE_REQ = 504,
  PHY_LA_CONFIG_REQ = 505,
  GPS_ENABLE_REQ = 506,
  PHY_ANT_WGT_TBL_CONFIG_REQ = 507,
  FW_DEBUG_REQ = 508,
  // north bound
  NODE_INIT_NOTIFY = 551,
  DR_LINK_STATUS = 552,
  FW_STATS = 553,
  FW_ACK = 591,  // fw ack for passthru message
  FW_HEALTHY = 592,

  // Miscellaneous (common)
  NONE = 1001,
  HELLO = 1002,
  E2E_ACK = 1003,
  TEST = 1004,
  DR_RESP = 1005, // driver response to all south bound messages to fw
  DR_STAT_PUSH = 1006, //push NB stats from driver
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
  FLASHED = 60,
  COMMIT_FAILED = 70,
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
  4: string upgradeReqId;
  5: i64 whenToCommit;
}

enum UpgradeReqType {
  PREPARE_UPGRADE = 10,
  COMMIT_UPGRADE = 20,
  RESET_STATUS = 30,
}

// Upgrade request to UpgradeApp
struct UpgradeReq {
  1: UpgradeReqType urType;
  2: string upgradeReqId;
  3: string md5; // expected md5 for downloaded image from server,
                 // required for urType: PREPARE_UPGRADE/COMMIT_UPGRADE
  4: string imageUrl; // image url the minion uses to upgrade
                      // required for urType: PREPARE_UPGRADE
  5: optional i64 scheduleToCommit;
}

#############  StatusApp ##############

struct GetStatusDump {}

struct StatusDump {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: map<string /* node id */, StatusReport> statusReports;
}

// Node parameters configured on each node.
struct NodeParams {
  1: optional BWAllocation.NodeBwAlloc bwAllocMap;
  2: optional Topology.PolarityType polarity;
  3: optional Topology.GolayIdx golayIdx;
  4: optional Topology.Location location;
  5: optional BWAllocation.NodeAirtime airtimeAllocMap;
}

struct StatusReport {
  1: i64 timeStamp;  // timestamp at which this response was received
  2: string ipv6Address;  // global-reachable IPv6 address for minion
  3: string version; // current minion version obtained from "/etc/version"
  6: string uboot_version; // uboot version string obtained during startup
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

// Set Link Status Request sent from cli to controller ignition app
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
  2: string responderMac; // responder mac address
  // link up specific parameters
  3: optional Topology.NodeType responderNodeType; // responder node type
  4: optional Topology.GolayIdx golayIdx; // responder golay code
}

// Link Status message sent from minion (initiator/responder) to controller
// indicates link status change: LINK_UP / LINK_DOWN (LINK_PAUSE)
struct LinkStatus {
  1: string responderMac; // mac address of the other end of link
  2: LinkStatusType linkStatusType; // whether link is up or down
}

#############  TopologyApp ##############

struct GetTopology {}

struct SetNodeStatus {
  1: string nodeMac;
  2: bool markAllLinksDown;
  3: bool markNodeDown;
}

struct SetNodeParamsReq {
  1: string nodeMac;
  2: optional NodeParams nodeParams;
}

struct SetNodeMac {
  1: string nodeName;
  2: string scannedBlob; // raw scanned data
}

struct BumpLinkUpAttempts {
  1: string linkName;
}

struct AddNode {
  1: Topology.Node node;
}

struct DelNode {
  1: string nodeName;
  2: bool forceDelete;
}

struct AddLink {
  1: Topology.Link link;
}

struct DelLink {
  1: string a_node_name;
  2: string z_node_name;
  3: bool forceDelete;
}

struct AddSite {
  1: Topology.Site site;
}

struct DelSite {
  1: string siteName;
}

############# KvStoreClient App #############

// set controller url request sent from kvstore client app to minion broker
struct SetCtrlParams {
  1: string ctrlUrl; // controller url
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
