namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Controller

include "BWAllocation.thrift"
include "Topology.thrift"
include "NodeConfig.thrift"

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

  // ===  ConfigApp  === //
  // Requests handled (by minion ConfigApp)
  GET_MINION_CONFIG_REQ = 721,
  GET_MINION_CONFIG_RESP = 722,
  SET_MINION_CONFIG_REQ = 723,

  // Requests handled (by ctrl ConfigApp)
  GET_CTRL_CONFIG_REQ = 731,
  GET_CTRL_CONFIG_RESP = 732,
  GET_CTRL_CONFIG_NODE_OVERRIDES_REQ = 733,
  GET_CTRL_CONFIG_NODE_OVERRIDES_RESP = 734,
  GET_CTRL_CONFIG_BASE_REQ = 735,
  GET_CTRL_CONFIG_BASE_RESP = 736,
  GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ = 737,
  GET_CTRL_CONFIG_NETWORK_OVERRIDES_RESP = 738,
  SET_CTRL_CONFIG_NODE_OVERRIDES_REQ = 739,
  SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ = 740,

  // ===  ScanApp === //
  // E2E -> Minion and Minion -> FW
  SCAN_REQ = 601,
  // FW->Minion and Minion -> E2E
  SCAN_RESP = 621,
  // CLI -> E2E
  START_SCAN = 641,
  GET_SCAN_STATUS = 642,
  RESET_SCAN_STATUS = 643,
  GET_SCAN_SCHEDULE = 644,
  SET_SCAN_SCHEDULE = 645,
  // E2E -> CLI
  SCAN_STATUS = 661,
  SCAN_SCHEDULE = 662,

  // === SchedulerApp === //
  // CLI -> E2E
  GET_SLOT_MAP_CONFIG = 701,
  SET_SLOT_MAP_CONFIG = 702,
  // E2E -> CLI
  SLOT_MAP_CONFIG = 703,

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

/**
 * @apiDefine ImageMeta_SUCCESS
 * @apiSuccess (:ImageMeta) {String} md5 The image MD5 digest
 * @apiSuccess (:ImageMeta) {String} version The image version string
 */
// terragraph image meta struct
struct ImageMeta {
  1: string md5; // image md5
  2: string version; // image version
}

/**
 * @apiDefine UpgradeStatus_SUCCESS
 * @apiSuccess (:UpgradeStatus) {Int(UpgradeStatusType)=10,20,30,40,50,60,70} usType
 *                              The upgrade status type
 *                              (10=NONE, 20=DOWNLOADING_IMAGE,
 *                               30=DOWNLOAD_FAILED, 40=FLASHING_IMAGE,
 *                               50=FLASH_FAILED, 60=FLASHED, 70=COMMIT_FAILED)
 * @apiSuccess (:UpgradeStatus) {Object(ImageMeta)} nextImage
 *                              The meta-info for the next image
 * @apiSuccess (:UpgradeStatus) {String} reason
 *                              The reason for the current status (if any)
 * @apiSuccess (:UpgradeStatus) {String} upgradeReqId The upgrade request ID
 * @apiSuccess (:UpgradeStatus) {Int64} whenToCommit
 *                              When to commit the upgrade (UNIX time)
 */
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

############# Config App #############

struct GetMinionConfigReq {}

struct GetMinionConfigResp {
  1: NodeConfig.NodeConfig config;
}

// Node action after setting config
enum CfgMinionAction {
  NO_ACTION = 0,
  REBOOT = 10,
}

struct SetMinionConfigReq {
  1: NodeConfig.NodeConfig config;
  2: CfgMinionAction action;
}

struct GetCtrlConfigReq {
  1: list<string> nodes; // Get for all nodes if empty
  2: string swVersion; // To determine the config base to use
}

struct GetCtrlConfigResp {
  1: map<string, NodeConfig.NodeConfig> config;
}

/**
 * @apiDefine GetCtrlConfigNodeOverridesReq
 * @apiParam {String[]} nodes The list of nodes, or all nodes if empty
 */
struct GetCtrlConfigNodeOverridesReq {
  1: list<string> nodes; // get for all nodes if empty
}

/**
 * @apiDefine GetCtrlConfigNodeOverridesResp_SUCCESS
 * @apiSuccess {String} overrides The node config overrides (JSON)
 */
struct GetCtrlConfigNodeOverridesResp {
  1: string overrides; // Json of node overrides
}

/**
 * @apiDefine SetCtrlConfigNodeOverridesReq
 * @apiParam {String} overrides The node config overrides (JSON), mapping node
 *           MAC addresses to their config overrides
 */
struct SetCtrlConfigNodeOverridesReq {
  1: string overrides; // Json of node overrides (maps Mac to overrides)
}

/**
 * @apiDefine GetCtrlConfigBaseReq
 * @apiParam {String[]} swVersions
 *           The software versions, or all versions if empty
 */
struct GetCtrlConfigBaseReq {
  1: list<string> swVersions; // get all base configs if empty
}

/**
 * @apiDefine GetCtrlConfigBaseResp_SUCCESS
 * @apiSuccess {String} config The base configs (JSON), mapping software version
 *             names to their base configs
 */
struct GetCtrlConfigBaseResp {
  1: string config; // Json of base configs (maps SW version to base config)
}

/**
 * @apiDefine GetCtrlConfigNetworkOverridesReq
 */
struct GetCtrlConfigNetworkOverridesReq {}

/**
 * @apiDefine GetCtrlConfigNetworkOverridesResp_SUCCESS
 * @apiSuccess {String} overrides The network config overrides (JSON)
 */
struct GetCtrlConfigNetworkOverridesResp {
  1: string overrides; // Json of network overrides
}

/**
 * @apiDefine SetCtrlConfigNetworkOverridesReq
 * @apiParam {String} config The network config overrides (JSON)
 */
struct SetCtrlConfigNetworkOverridesReq {
  1: string config; // Json of network overrides
}

#############  StatusApp ##############

/**
 * @apiDefine GetStatusDump
 */
struct GetStatusDump {}

/**
 * @apiDefine RebootReq
 * @apiParam {String[]} nodes The list of nodes
 * @apiParam {Boolean} force Force reboot
 * @apiParam {Int32} secondsToReboot The number of seconds until reboot
 */
struct RebootReq {
  1: list<string> nodes;
  2: bool force;
  3: i32 secondsToReboot;
}

struct RebootNode {
  1: bool force;
  2: optional i32 secondsToReboot = 5;
}

/**
 * @apiDefine StatusDump_SUCCESS
 * @apiSuccess {Int64} timeStamp
 *             The time at which this response was generated
 * @apiSuccess {Map(String:Object(StatusReport))} statusReports
 *             The per-node status reports
 */
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

/**
 * @apiDefine StatusReport_SUCCESS
 * @apiSuccess (:StatusReport) {Int64} timeStamp
 *                             The time at which this response was received
 * @apiSuccess (:StatusReport) {String} ipv6Address
 *                             The globally-reachable IPv6 address of the minion
 * @apiSuccess (:StatusReport) {String} version
 *                             The current minion version (from "/etc/version")
 * @apiSuccess (:StatusReport) {String} ubootVersion
 *                             The uboot version string (obtained at startup)
 * @apiSuccess (:StatusReport) {Int(NodeStatusType)=1,2,3} status
 *                             The ignition state of the minion
 *                             (1=OFFLINE, 2=ONLINE, 3=ONLINE_INITIATOR)
 * @apiSuccess (:StatusReport) {Object(UpgradeStatus)} upgradeStatus
 *                             The upgrade status
 */
struct StatusReport {
  1: i64 timeStamp;  // timestamp at which this response was received
  2: string ipv6Address;  // global-reachable IPv6 address for minion
  3: string version; // current minion version obtained from "/etc/version"
  6: string ubootVersion; // uboot version string obtained during startup
  4: Topology.NodeStatusType status; // ignition state of minion
  5: UpgradeStatus upgradeStatus;
  7: string configMd5;
}

#############  IgnitionApp ##############

/**
 * @apiDefine GetIgnitionState
 */
struct GetIgnitionState {}

/**
 * @apiDefine IgnitionParams
 * @apiParam {Boolean} [enable] The state of network-wide ignition
 * @apiParam {Int64} [linkUpInterval] The frequency of ignition
 * @apiParam {Int64} [linkUpDampenInterval]
 *           The interval of ignition on the same link
 * @apiParam {Map(String:Boolean)} [linkAutoIgnite]
 *           The per-link auto ignition (linkName:enable)
 */
/**
 * @apiDefine IgnitionParams_SUCCESS
 * @apiSuccess (:IgnitionParams) {Boolean} [enable]
 *                               The state of network-wide ignition
 * @apiSuccess (:IgnitionParams) {Int64} [linkUpInterval]
 *                               The frequency of ignition
 * @apiSuccess (:IgnitionParams) {Int64} [linkUpDampenInterval]
 *                               The interval of ignition on the same link
 * @apiSuccess (:IgnitionParams) {Map(String:Boolean)} [linkAutoIgnite]
 *                               The per-link auto ignition (linkName:enable)
 */
// Parameters controlling the ignition in the controller
struct IgnitionParams {
  1: optional bool enable;  // Network-wide auto-ignition from the controller
  2: optional i64 linkUpInterval;  // set frequency of ignition
  3: optional i64 linkUpDampenInterval; // interval of ignition on same link
  // per-link auto ignition
  4: optional map<string /* link name */, bool> linkAutoIgnite;
}

// Set Link Status Request sent from cli to controller ignition app
// instructs controller to send a SetLinkStatus msg to initiator node
struct SetLinkStatusReq {
  1: LinkActionType action; // link update action (up/down)
  2: string initiatorNodeName;
  3: string responderNodeName;
}

/**
 * @apiDefine IgnitionCandidate_SUCCESS
 * @apiSuccess (:IgnitionCandidate) {String} initiatorNodeName
 *                                  The name of the initiator node
 * @apiSuccess (:IgnitionCandidate) {String} linkName The link name
 */
struct IgnitionCandidate {
  1: string initiatorNodeName;
  2: string linkName;
}

/**
 * @apiDefine IgnitionState_SUCCESS
 * @apiSuccess {String[]} visitedNodeNames The names of the visited nodes
 * @apiSuccess {Object(IgnitionCandidate)[]} igCandidates
 *             The ignition candidates
 * @apiSuccess {Object(IgnitionCandidate)[]} lastIgCandidates
 *             The last ignition candidates
 * @apiSuccess {Object(IgnitionParams)} igParams The ignition parameters
 */
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

/**
 * @apiDefine SetNodeMac
 * @apiParam {String} nodeName The node name
 * @apiParam {String} nodeMac The node MAC address to set
 * @apiParam {Boolean} force Force set
 */
/**
 * @apiDefine SetNodeMac_GROUP
 * @apiParam (:SetNodeMac) {String} nodeName The node name
 * @apiParam (:SetNodeMac) {String} nodeMac The node MAC address to set
 * @apiParam (:SetNodeMac) {Boolean} force Force set
 */
struct SetNodeMac {
  1: string nodeName;
  2: string nodeMac;
  3: bool force;
}

/**
 * @apiDefine SetNodeMacList
 * @apiParam {Object(SetNodeMac)[]} setNodeMacList
 *           The list of node MAC addresses to set
 */
struct SetNodeMacList {
  1: list<SetNodeMac> setNodeMacList;
}

struct SetTopologyName {
  1: string name;
}

struct BumpLinkUpAttempts {
  1: string linkName;
}

/**
 * @apiDefine AddNode
 * @apiParam {Object(Node)} node The node
 */
struct AddNode {
  1: Topology.Node node;
}

/**
 * @apiDefine DelNode
 * @apiParam {String} nodeName The node name
 * @apiParam {Boolean} force Force node deletion
 */
struct DelNode {
  1: string nodeName;
  2: bool force;
}

// only supports editing the name for now
struct EditNode {
  1: string nodeName;
  2: Topology.Node newNode;
}

/**
 * @apiDefine AddLink
 * @apiParam {Object(Link)} link The link
 */
struct AddLink {
  1: Topology.Link link;
}

/**
 * @apiDefine DelLink
 * @apiParam {String} aNodeName The A-node name
 * @apiParam {String} zNodeName The Z-node name
 * @apiParam {Boolean} force Force link deletion
 */
struct DelLink {
  1: string aNodeName;
  2: string zNodeName;
  3: bool force;
}

/**
 * @apiDefine AddSite
 * @apiParam {Object(Site)} site The site
 */
struct AddSite {
  1: Topology.Site site;
}

/**
 * @apiDefine DelSite
 * @apiParam {String} siteName The site name
 */
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

/**
 * @apiDefine BulkAdd
 * @apiParam {Object(Site)[]} sites The sites to add
 * @apiParam {Object(Node)[]} nodes The nodes to add
 * @apiParam {Object(Link)[]} links The links to add
 */
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

struct GetScanSchedule {}

struct ScanSchedule {
  1: optional i32 imScanTimeoutSec;
  2: optional i32 pbfScanTimeoutSec;
}

struct GetSlotMapConfig {}

struct Slot {
  1: i32 start;
  2: i32 len;
}

enum SlotPurpose {
  SP_IM = 0,
  SP_PBF = 1,
  SP_RTAC = 2,
  SP_VBF = 3,
  SP_NULLING = 4,
  SP_IGNITION = 5,
}

struct SlotMapConfig {
  1: i32 slotLen; // in BWGDs
  2: i32 periodLen; // in slots
  3: map<SlotPurpose, list<Slot>> mapping; // List of permissible slots
                                           // per purpose/app
}

############# Common #############

struct Message {
  1: MessageType mType;
  2: binary value;
}

// hello message send/reply by both sides for confirmation of established
// communication channel
struct Hello {}

/**
 * @apiDefine E2EAck_SUCCESS
 * @apiSuccess {Boolean} success The response status
 * @apiSuccess {String} message The response message
 */
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
  6: string dhcpNameServer;
  7: i64 dhcpRangeMin;
  8: i64 dhcpRangeMax;
}

// Empty message
struct Empty {}
