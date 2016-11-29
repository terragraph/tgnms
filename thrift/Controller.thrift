namespace cpp2 facebook.terragraph.thrift
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
  // Responses given (by Ctrl TopologyApp)
  TOPOLOGY = 321,

  // ===  UpgradeApp  === //
  // Requests handled (by minion UpgradeApp)
  UPGRADE_REQ = 401,
  // Messages originated (by minion UpgradeApp)
  SET_UPGRADE_STATUS = 421,

  // ===  KvStoreClientApp  === //
  SET_CTRL_PARAMS = 501,

  // === DriverApp === //
  // Message exchange with driver
  DR_ACK = 491,

  // Message exchange with firmware
  // south bound
  NODE_INIT = 501,
  DR_SET_LINK_STATUS = 502,  // link up/link down request
  FW_SET_NODE_PARAMS = 503,  // set bandwidth allocation map
  FW_STATS_CONFIGURE_REQ = 504,
  PHY_LA_LOOKUP_CONFIG_REQ = 505,
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

// Upgrade request from viper to UpgradeApp
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
  1: optional BWAllocation.BwAllocationMap bwAllocMap;
  2: optional Topology.PolarityType polarity;
  3: optional Topology.GolayIdx golayIdx;
  4: optional Topology.Location location;
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
}

struct AddLink {
  1: Topology.Link link;
}

struct DelLink {
  1: string a_node_name;
  2: string z_node_name;
}


############# KvStoreClient App #############

// set controller url request sent from kvstore client app to minion broker
struct SetCtrlParams {
  1: string ctrlUrl; // controller url
}

############# DriverIf #############

// Firmware configuration parameters
struct FwOptParams {
      // Note: All params may be configured as a part of node init. Params that
      //       are marked as a "per-link param", may be further overridden at
      //       the initiator during association.
  1:  optional i64 antCodeBook;
      // Definition: Enum to choose between different RF antennas supported
      // Values: 0: Use BRCM codebook (unsupported)
      //         1: Use FB codebook
      // Default: 1
  2:  optional i64 polarity;
      // Definition: Param to indicate polarity selection for a DN-Initiator,
      //             that has no prior links
      // Values: 0: Odd
      //         1: Even
      //         2: Hybrid (unsupported)
      // Default: 1
  3:  optional i64 frameConfig;
      // Definition: Deprecated
      // Values: --
      // Default: --
  4:  optional i64 numOfPeerSta;
      // Definition: Static parameter used for bandwidth allocation between a
      //             predetermined fixed number of nodes
      // Values: [1:4]
      // Default: 4
  7:  optional i64 gpioConfig;
      // Definition: [Debug only] Param to set output on GPIO for open board
      //             debug. (Unsupported on EVT_2.0)
      // Values: 0: MAC scheduler debug
      //         1: Air Tx/Rx mode
      //         2: Tx beam read
      //         3: Rx beam read
      // Default: 0
  8:  optional i64 channel;
      // Definition: RF channel in use at 60GHz
      // Values: [0:3]
      // Default: 2
  9:  optional i64 swConfig;
      // Definition: Debug modes for bandwidth handler and beamforming scan
      // Values: 0: Static BW handler, no BF scan
      //         1: BF scan with test BW handler
      //         2: Test BW handler with no BF scan
      //         3: Static BW handler with BF scan
      // Default: 0
  10: optional i64 mcs;
      // Definition: [per-link param] MCS used on all links if initial and
      //             dynamic link adaptation is disabled
      // Values: [1:12]
      // Default: 9
  11: optional i64 txPower;
      // Definition: [per-link param] Transmit power in 0.25 dBm step
      // Values: [-20:2]*4
      // Default: 0
  12: optional i64 rxBuffer;
      // Definition: [per-link param] Block-ack receive window size
      // Values: 8:63, but only 63 supported
      // Default: 63
  13: optional i64 beamConfig;
      // Definition: [per-link param] Enum indicating beam forming mode
      // Values: 0: Use BRCM defaults (not recommended)
      //         1: Use [tx|rx]BeamIndex specified in cfg file
      //         2: Use indices from the BF scan
      // Default: 0
  14: optional i64 txBeamIndex;
      // Definition: [per-link param] The index of the Tx Beam when beamConfig
      //             param is set to "1"
      // Values: [0:63]
      // Default: 0
  15: optional i64 rxBeamIndex;
      // Definition: [per-link param] The index of the Rx Beam when beamConfig
      //             param is set to "1"
      // Values: [0:63]
      // Default: 0
  18: optional i64 numOfHbLossToFail;
      // Definition: Count of consecutive number of HBs that if lost will
      //             cause the link to be declared as a failure. Note: A HB is
      //             sent once every BWGD
      // Values: [1:10000]
      // Default: 10
  19: optional i64 statsLogInterval;
      // Definition: Periodicity (in ms) for logging of stats
      // Values: [200:3600000]
      // Default: 1000
  20: optional i64 statsPrintInterval;
      // Definition: Periodicity (in ms) for printing of per-station stats
      //             to kernel-log
      // Values: 0: Disable
      //         [200:3600000]: Enable
      // Default: 1024
  21: optional i64 forceGpsDisable;
      // Definition: Boolean to prevent GPS sync check at initiator during assoc
      // Values: 0: Enable GPS
      //         1: Disable GPS
      // Default: 0
  22: optional i64 lsmAssocRespTimeout;
      // Definition: Timeout (in ms) on reception of Assoc Resp at initiator
      // Values: [10:60000]
      // Default: 500
  23: optional i64 lsmSendAssocReqRetry;
      // Definition: Max number of retries by initiator when waiting for Assoc Resp
      // Values: [0:100]
      // Default: 5
  24: optional i64 lsmAssocRespAckTimeout;
      // Definition: Timeout (in ms) on reception of Assoc Resp Ack at responder
      // Values: [10-60000]
      // Default: 500
  25: optional i64 lsmSendAssocRespRetry;
      // Definition: Max number of retries by initiator when waiting for Assoc Resp
      // Values: [0:100]
      // Default: 5
  26: optional i64 lsmRepeatAckInterval;
      // Definition: Interval (in ms) between retransmissions of Assoc Resp Ack
      //             by initiator
      // Values: [10:500]
      // Default: 50
  27: optional i64 lsmRepeatAck;
      // Definition: Number of retransmissions of Assoc Resp Ack
      // Values: [1:10]
      // Default: 1
  28: optional i64 lsmFirstHeartbTimeout;
      // Definition: Wait time (in ms) for first heartbeat after completion of
      //             association procedure
      // Values: [100:1000]
      // Default: 260
  29: optional i64 txSlot0Start;
      // Definition: Time (in us) from start of frame to start of Tx slot 0
      // Values: [1:399], but only 4 supported
      // Default: 4
  30: optional i64 txSlot0End;
      // Definition: Time (in us) from start of frame to end of Tx slot 0
      // Values: [1:399], but only 62 supported
      // Default: 62
  31: optional i64 txSlot1Start;
      // Definition: Time (in us) from start of frame to start of Tx slot 1
      // Values: [1:399], but only 70 supported
      // Default: 70
  32: optional i64 txSlot1End;
      // Definition: Time (in us) from start of frame to end of Tx slot 1
      // Values: [1:399], but only 128 supported
      // Default: 128
  33: optional i64 txSlot2Start;
      // Definition: Time (in us) from start of frame to start of Tx slot 2
      // Values: [1:399], but only 136 supported
      // Default: 136
  34: optional i64 txSlot2End;
      // Definition: Time (in us) from start of frame to end of Tx slot 2
      // Values: [1:399], but only 196 supported
      // Default: 196
  35: optional i64 rxSlot0Start;
      // Definition: Time (in us) from start of frame to start of Rx slot 0
      // Values: [1:399], but only 4 supported
      // Default: 4
  36: optional i64 rxSlot0End;
      // Definition: Time (in us) from start of frame to end of Rx slot 0
      // Values: [1:399], but only 62 supported
      // Default: 62
  37: optional i64 rxSlot1Start;
      // Definition: Time (in us) from start of frame to start of Rx slot 1
      // Values: [1:399], but only 70 supported
      // Default: 70
  38: optional i64 rxSlot1End;
      // Definition: Time (in us) from start of frame to end of Rx slot 1
      // Values: [1:399], but only 128 supported
      // Default: 128
  39: optional i64 rxSlot2Start;
      // Definition: Time (in us) from start of frame to start of Rx slot 2
      // Values: [1:399], but only 136 supported
      // Default: 136
  40: optional i64 rxSlot2End;
      // Definition: Time (in us) from start of frame to end of Rx slot 2
      // Values: [1:399], but only 196 supported
      // Default: 196
  41: optional i64 gpsTimeout;
      // Definition: Timeout (in seconds) for response to gps_enable procedure
      // Values: [1:600]
      // Default: 200
  42: optional i64 linkAgc;
      // Definition: [per-link param] Freezes the AGC. Unsupported on 20130
      // Values: Unset: Use AGC
      //         []   : Freeze AGC
      // Default: Unset
  43: optional i64 respNodeType;
      // Definition: Node type of the responder
      // Values: 1: CN
      //         2: DN
      // Default: 1
  44: optional i64 txGolayIdx;
      // Definition: [per-link config] GolayIdx use by phy layer for Tx.
      //             Currently unsupported
      // Values: [0-7]
      // Default: --
  45: optional i64 rxGolayIdx;
      // Definition: [per-link config] GolayIdx in use by phy layer for Rx.
      //             Currently unsupported
      // Values: [0-7]
      // Default: --
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
