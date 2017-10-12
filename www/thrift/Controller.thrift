namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Controller

include "BWAllocation.thrift"
include "Topology.thrift"

enum MessageType {

  // ===  StatusApp  === //
  // Requests handled (by Ctrl StatusApp)
  GET_STATUS_DUMP = 101,
  REBOOT_REQUEST = 102;
  // Responses given (by Ctrl StatusApp)
  STATUS_DUMP = 121,
  // Requests handled (by Minion StatusApp)
  SET_NODE_PARAMS = 141,
  REBOOT_NODE = 142,
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
  GET_LINK_STATUS = 242,
  // Messages originated (by Minion IgnitionApp)
  LINK_STATUS = 261,

  // ===  TopologyApp  === //
  // Requests handled (by Ctrl TopologyApp)
  GET_TOPOLOGY = 301,
  SET_NODE_STATUS = 302,
  SET_NODE_MAC = 303,
  SET_NODE_MAC_LIST = 315,
  SET_NODE_PARAMS_REQ = 304,
  BUMP_LINKUP_ATTEMPTS = 305,
  ADD_NODE = 306,
  ADD_LINK = 307,
  DEL_NODE = 308,
  DEL_LINK = 309,
  ADD_SITE = 310,
  DEL_SITE = 311,
  EDIT_SITE = 317,
  EDIT_NODE = 318,
  SET_NETWORK_PARAMS_REQ = 312,
  RESET_TOPOLOGY_STATE = 313,
  SET_TOPOLOGY_NAME = 314,
  BULK_ADD = 316,
  // Responses given (by Ctrl TopologyApp)
  TOPOLOGY = 321,

  // ===  UpgradeApp  === //
  // Requests handled (by minion UpgradeApp)
  UPGRADE_REQ = 401,
  // Messages originated (by minion UpgradeApp)
  SET_UPGRADE_STATUS = 421,
  // Requests handled (by Ctrl UpgradeApp)
  UPGRADE_GROUP_REQ = 441,
  UPGRADE_STATE_REQ = 442,
  UPGRADE_ABORT_REQ = 443,
  UPGRADE_COMMIT_PLAN_REQ = 444,
  UPGRADE_ADD_IMAGE_REQ = 445,
  UPGRADE_DEL_IMAGE_REQ = 446,
  UPGRADE_LIST_IMAGES_REQ = 447,
  // responses given (by Ctrl UpgradeApp)
  UPGRADE_STATE_DUMP = 451,
  UPGRADE_COMMIT_PLAN = 452,
  UPGRADE_LIST_IMAGES_RESP = 453,

  // ===  ScanApp === //
  // E2E -> Minion and Minion -> FW
  SCAN_REQ = 601,
  // FW->Minion and Minion -> E2E
  SCAN_RESP = 621,
  // CLI -> E2E
  START_SCAN = 641,
  GET_SCAN_STATUS = 642,
  RESET_SCAN_STATUS = 643,
  // E2E -> CLI
  SCAN_STATUS = 661,

  // === DriverApp === //
  // Message exchange with driver
  // north bound
  DR_ACK = 491,
  GPS_GET_POS_RESP = 492,
  DR_DEV_ALLOC_RES = 493,
  // south bound
  GPS_GET_POS_REQ = 495,
  DR_DEV_ALLOC_REQ = 496,

  // Message exchange with firmware
  // south bound
  NODE_INIT = 501,
  DR_SET_LINK_STATUS = 502,  // link up/link down request
  FW_SET_NODE_PARAMS = 503,  // set bandwidth allocation map
  FW_STATS_CONFIGURE_REQ = 504,
  PHY_LA_CONFIG_REQ = 505,
  GPS_ENABLE_REQ = 506,
  FW_SET_CODEBOOK = 507,
  FW_DEBUG_REQ = 508,
  PHY_AGC_CONFIG_REQ = 509,
  PHY_GOLAY_SEQUENCE_CONFIG_REQ = 510,
  FW_CONFIG_REQ = 511,
  PHY_TPC_CONFIG_REQ = 512,
  FW_BF_RESP_SCAN = 513,
  // north bound
  NODE_INIT_NOTIFY = 551,
  DR_LINK_STATUS = 552,
  FW_STATS = 553,
  FW_ACK = 591,  // fw ack for passthru message
  FW_HEALTHY = 592,
  FW_GET_CODEBOOK = 593,

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

struct UpgradeTorrentParams {
  1: i64 downloadTimeout; // required. Download timeout
  2: optional i64 downloadLimit = -1;  // Unlimited by default
  3: optional i64 uploadLimit = -1;  // Unlimited by default
  4: optional i64 maxConnections = -1; // Unlimited by default
}

// upgrade request to minion UpgradeApp
struct UpgradeReq {
  1: UpgradeReqType urType;
  2: string upgradeReqId;
  3: string md5; // expected md5 for downloaded image from server,
                 // required for urType: PREPARE_UPGRADE/COMMIT_UPGRADE
  4: string imageUrl; // image url the minion uses to upgrade
                      // required for urType: PREPARE_UPGRADE
  5: optional i64 scheduleToCommit; // delay before minion commits
  6: optional i64 downloadAttempts; // for urType: PREPARE_UPGRADE
  7: optional UpgradeTorrentParams torrentParams; // for urType: PREPARE_UPGRADE
}

enum UpgradeGroupType {
  NODES = 10,    // upgrade operation on a list of nodes
  NETWORK = 20,  // upgrade operation on the entire network
}

// upgrade request sent to controller to upgrade a group of nodes
struct UpgradeGroupReq {
  1: UpgradeGroupType ugType;
  2: list<string> nodes; // for Nodes level upgrade
  3: list<string> excludeNodes; // for Network level upgrade
  4: UpgradeReq urReq; // request type specific information
  5: i64 timeout; // node should prepare/commit successfully
                  // within the timeout duration
  6: bool skipFailure; // should the controller move onto the next
                       // node if the current node fails?
  7: string version;   // enforce version check before prepare or commit
                       // if provided
  8: list<string> skipLinks; // Skip wirelessLinkAlive check on these links
                             // for commit
  9: i64 limit;  // maximum number of nodes per batch
}

struct UpgradeStateReq {}

struct UpgradeStateDump {
  1: list<string> curBatch;
  2: list<list<string>> pendingBatches;
  3: UpgradeGroupReq curReq;
  4: list<UpgradeGroupReq> pendingReqs;
}

struct UpgradeAbortReq {
  1: bool abortAll;
  2: list<string> reqIds;
}

struct UpgradeCommitPlanReq {
  1: i64 limit;  // maximum number of nodes per batch
  2: list<string> excludeNodes;
}

struct UpgradeCommitPlan {
  1: list<list<string>> commitBatches;
  2: list<string> canaryLinks; // Each canary link is represented by a
                               // list of 2 nodes
}

struct UpgradeImage {
  1: string name; // unique, descriptive name for the image (not filename)
  2: string magnetUri; // magnet URI for this image
  3: string md5; // md5 hash (needed for PREPARE_UPGRADE/COMMIT_UPGRADE)
}

struct UpgradeAddImageReq {
  1: string imageUrl; // image http URL (for controller to download)
}

struct UpgradeDelImageReq {
  1: string name; // 'name' from UpgradeImage
}

struct UpgradeListImagesReq {}

struct UpgradeListImagesResp {
  1: list<UpgradeImage> images;
}

#############  StatusApp ##############

struct GetStatusDump {}

struct RebootReq {
  1: list<string> nodes;
  2: bool forced;
  3: i32 secondsToReboot;
}

struct RebootNode {
  1: bool forced;
  2: optional i32 secondsToReboot = 5;
}

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
  6: optional bool enableGps;
  7: optional byte channel;
}

struct StatusReport {
  1: i64 timeStamp;  // timestamp at which this response was received
  2: string ipv6Address;  // global-reachable IPv6 address for minion
  3: string version; // current minion version obtained from "/etc/version"
  6: string uboot_version; // uboot version string obtained during startup
  4: Topology.NodeStatusType status; // ignition state of minion
  5: UpgradeStatus upgradeStatus;
}

#############  IgnitionApp ##############

struct GetIgnitionState {}

// Parameters controlling the ignition in the controller
struct IgnitionParams {
  1: optional bool enable;  // Network-wide auto-ignition from the controller
  2: optional i64 linkUpInterval;  // set frequency of ignition
  3: optional i64 linkUpDampenInterval; // interval of ignition on same link
  // per-link auto ignition
  4: optional map<string /* link name */, bool> link_auto_ignite;
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
  3: list<IgnitionCandidate> lastIgCandidates;
  4: IgnitionParams igParams;
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
  5: optional i64 controlSuperframe;  // control superframe for the link
  6: optional Topology.PolarityType responderNodePolarity;  // responder Node
                                                            // Polarity
}

// GetLinkStatus messge sent from controller to minion on node
struct GetLinkStatus {
  1: string responderMac; // responder mac address
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
  3: Topology.NodeStatusType nodeStatus;
}

struct SetNodeParamsReq {
  1: string nodeMac;
  2: optional BWAllocation.NodeAirtime nodeAirtime;
  3: optional BWAllocation.NodeBwAlloc nodeBWAlloc;
}

struct SetNetworkParamsReq {
  1: optional BWAllocation.NetworkAirtime networkAirtime;
  2: optional BWAllocation.NetworkBwAlloc networkBWAlloc;
  3: optional byte channel;
}

struct SetNodeMac {
  1: string nodeName;
  2: string nodeMac;
  3: bool force;
}

struct SetNodeMacList {
  1: list<SetNodeMac> setNodeMacList;
}

struct SetTopologyName {
  1: string name;
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

// only supports editing the name for now
struct EditNode {
  1: string nodeName;
  2: Topology.Node newNode;
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

// only supports editing the name for now
struct EditSite {
  1: string siteName;
  2: Topology.Site newSite;
}

struct ResetTopologyState {
  1: bool resetLinkupAttempts;
}

struct BulkAdd {
  1: list<Topology.Site> sites;
  2: list<Topology.Node> nodes;
  3: list<Topology.Link> links;
}

############# Scan App #############

// transmit and receive beamforming indices of a micro route
struct MicroRoute {
  1: i16 tx;
  2: i16 rx;
}

// individual micro-route measurement/report
struct RouteInfo {
  1: MicroRoute route; // beamforming indices of micro route
  2: double rssi;      // received signal strength, in dBm
  3: double snrEst;    // measured during the short training field, in dB
  4: double postSnr;   // measured after the equalizer, in dB
  5: i32 rxStart;      // relative arrival time of the packet, in us
  6: byte packetIdx;   // Repeat count of this packet, 0-based
}

enum ScanMode {
  COARSE = 1,
  FINE = 2,
  SELECTIVE = 3,
}

// Runtime Calibration
enum RTCal {
  NO_CAL = 0, // No calibration, init state
  TOP_RX_CAL = 1, // Top Panel, responder Rx cal with fixed intiator Tx beam
  TOP_TX_CAL = 2, // Top Panel, intiator Tx cal with fixed responder Rx beam
  BOT_RX_CAL = 3, // Bot Panel, responder Rx cal with fixed intiator Tx beam
  BOT_TX_CAL = 4, // Bot Panel, intiator Tx cal with fixed responder Rx beam
  VBS_RX_CAL = 5, // Top + Bot, responder Rx cal with fixed intiator Tx beam
  VBS_TX_CAL = 6, // Top + Bot, intiator Tx cal with fixed responder Rx beam
}

struct BeamIndices {
  1: i32 low;
  2: i32 high;
}

struct ScanReq {
  1: i32 token; // token to match request to response
  2: ScanMode scanMode; // scan mode
  3: i64 startBwgdIdx; // start time of scan in BWGD index
  4: bool bfScanInvertPolarity; // Invert Polarity when using with same
                                // Polarity peer
  5: optional string txNodeMac; // tx node id (only present for receivers)
  6: optional string rxNodeMac; // broadcast or specific node (for tx only)
  7: optional list<MicroRoute> routes; // for partial scan, absent for full scan
  8: optional BeamIndices beams; // Beam indices range
  9: bool enablePbfUrx; // 0 - disable URX after PBF
                        // 1 - enable URX after PBF
  // These are for selective scan
  10: optional RTCal rtCal;
  11: optional byte bwgdLen;

  // This is to control tx power
  12: optional i16 txPwrIndex; // tx power index (0 - 31)
}

struct ScanResp {
   1: i32 token; // token to match request to response
   2: i64 curSuperframeNum; // time-stamp of measurement
   3: list<RouteInfo> routeInfoList; // list of routes
}

struct StartScan {
  1: bool isPBF; // PBF or IM scan?
  2: ScanMode scanMode;
  3: i64 startTime; // Unixtime of the scan start
  4: optional string txNode; // If present, run scan on tx<->rx links.
                             // Otherwise, run IM scan on whole network
  5: optional list<string> rxNodes; // Should be present iff txNode is present.
                                    // Should be a singleton for PBF scan
  6: optional list<BeamIndices> beams; // Beam indices for each node
  7: bool enablePbfUrx; // Enable/Disable URX based on PBF

  // These are for selective scan
  8: optional RTCal rtCal;
  9: optional byte bwgdLen;

  // This is to control tx power
  10: optional i16 txPwrIndex; // tx power index (0 - 31)
}

struct GetScanStatus {
  1: bool isConcise;
  2: optional i32 tokenFrom;
  3: optional i32 tokenTo;
}

struct ResetScanStatus {
  1: optional i32 tokenFrom;
  2: optional i32 tokenTo;
}

// Data collected from a single scan.
// Filled in incrementally, as responses arrive.
struct ScanData {
  1: map<string /* nodename */, ScanResp> responses;
  2: string txNode;
  3: i64 startBwgdIdx;
}

struct ScanStatus {
  1: map<i32 /* token */, ScanData> scans;
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

struct BgpNeighbor {
  1: i64 asn;
  2: string ipv6;
}

// TODO: deprecate
struct BgpNeighbors {
  1: list<BgpNeighbor> neighbors;
}

struct BgpConfig {
  1: i64 localAsn;
  2: list<BgpNeighbor> neighbors;
}

// network information needee by different processes
struct NetworkInfo {
  1: string e2eCtrlUrl;
  2: list<string> aggrCtrlUrl;
  3: string network;
  4: BgpNeighbors bgpNeighbors; // TODO: depreacte
  5: BgpConfig bgpConfig;
}

// Empty message
struct Empty {}
