namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Controller

cpp_include "<unordered_map>"
cpp_include "<unordered_set>"

include "Lsdb.thrift"

include "BWAllocation.thrift"
include "Topology.thrift"

enum MessageType {

  // ===  StatusApp  === //
  // Requests handled (by Ctrl StatusApp)
  GET_STATUS_DUMP = 101,
  REBOOT_REQUEST = 102,
  GET_CTRL_NEIGHBORS_REQ = 103,
  // Responses given (by Ctrl StatusApp)
  STATUS_DUMP = 121,
  GET_CTRL_NEIGHBORS_RESP = 122,
  GET_NEIGHBORS_RESP = 123,
  // Requests handled (by Minion StatusApp)
  SET_NODE_PARAMS = 141,
  REBOOT_NODE = 142,
  GET_MINION_NEIGHBORS_REQ = 143,
  UPDATE_LINK_METRICS = 144,

  // Messages originated (by Minion StatusApp)
  STATUS_REPORT = 161,
  STATUS_REPORT_ACK = 162,
  GET_MINION_NEIGHBORS_RESP = 163,

  // ===  IgnitionApp  === //
  // Requests handled (by Ctrl IgnitionApp)
  GET_IGNITION_STATE = 201,
  SET_IGNITION_PARAMS = 202,
  SET_LINK_STATUS_REQ = 203,
  LINK_STATUS_EVENT = 204,
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
  GET_NETWORK_AIRTIME = 319,
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
  GET_ROUTES = 320,
  SET_PREFIXES = 324,
  GET_NODE_PREFIXES = 325,
  GET_ZONE_PREFIXES = 326,
  ALLOCATE_PREFIXES = 329,
  // Responses given (by Ctrl TopologyApp)
  TOPOLOGY = 321,
  NETWORK_AIRTIME = 322,
  GET_ROUTES_RESP = 323,
  GET_NODE_PREFIXES_RESP = 327,
  GET_ZONE_PREFIXES_RESP = 328,

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
  GET_MINION_CONFIG_ACTIONS_REQ = 725,
  GET_MINION_CONFIG_ACTIONS_RESP = 726,

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
  // 741, 742 (deprecated in RELEASE_M21)
  GET_CTRL_CONFIG_METADATA_REQ = 743,
  GET_CTRL_CONFIG_METADATA_RESP = 744,
  GET_CTRL_CONFIG_NETWORK_OVERRIDES_ACTIONS_REQ = 745,
  GET_CTRL_CONFIG_NODE_OVERRIDES_ACTIONS_REQ = 746,
  GET_CTRL_CONFIG_OVERRIDES_ACTIONS_RESP = 747,
  GET_CTRL_CONFIG_ACTIONS_RESULTS_REQ = 748,
  GET_CTRL_CONFIG_ACTIONS_RESULTS_RESP = 749,
  GET_CTRL_CONFIG_CONTROLLER_REQ = 750,
  GET_CTRL_CONFIG_CONTROLLER_RESP = 751,
  SET_CTRL_CONFIG_CONTROLLER_REQ = 752,
  GET_CTRL_CONFIG_CONTROLLER_METADATA_REQ = 753,
  GET_CTRL_CONFIG_CONTROLLER_METADATA_RESP = 754,
  GET_CTRL_CONFIG_AUTO_NODE_OVERRIDES_REQ = 755,
  GET_CTRL_CONFIG_AUTO_NODE_OVERRIDES_RESP = 756,

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
  RESET_CBF_CONFIG = 646,
  GET_CBF_CONFIG = 647,
  SET_CBF_CONFIG = 648,
  RESET_RF_STATE = 649,
  GET_RF_STATE = 650,
  SET_RF_STATE = 651,
  // E2E -> CLI
  SCAN_STATUS = 661,
  SCAN_SCHEDULE = 662,
  CBF_CONFIG = 663,
  RF_STATE = 664,
  // Config
  SCAN_SCHEDULE_UPDATED = 670,

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
  DR_WSEC_STATUS = 494,
  DR_WSEC_LINKUP_STATUS = 497,
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
  FW_SET_LOG_CONFIG = 514,
  // north bound
  NODE_INIT_NOTIFY = 551,
  DR_LINK_STATUS = 552,
  FW_STATS = 553,
  FW_ACK = 591,  // fw ack for passthru message
  FW_HEALTHY = 592,
  FW_GET_CODEBOOK = 593,
  FW_CONFIG_RESP = 594,
  FW_ROUTING_INFO = 595,
  FW_ADJ_REQ = 596,

  // ===  OpenrClientApp  === //
  SYNC_LINK_MONITOR = 801,
  INJECT_KVSTORE_KEYS = 802,
  GET_ROUTING_ADJACENCIES = 810,
  ROUTING_ADJACENCIES = 811,
  SET_LINK_METRIC = 812,
  FW_ADJ_RESP = 813,

  // ===  TrafficApp  === //
  // Requests handled (by ctrl TrafficApp)
  START_IPERF = 901,
  START_IPERF_RESP = 902,
  STOP_IPERF = 903,
  GET_IPERF_STATUS = 904,
  IPERF_STATUS = 905,
  START_PING = 906,
  START_PING_RESP = 907,
  STOP_PING = 908,
  GET_PING_STATUS = 909,
  PING_STATUS = 910,
  // Messages originated by ctrl TrafficApp to minion
  START_IPERF_SERVER = 911,
  START_IPERF_CLIENT = 912,
  // Messages originated by minion to ctrl TrafficApp
  START_IPERF_SERVER_RESP = 921,
  IPERF_OUTPUT = 922,
  PING_OUTPUT = 923,

  // ===  BinaryStarApp  === //
  // Messages between peer controllers
  BSTAR_SYNC = 1101,
  // Messages between BinaryStarApp / Broker
  BSTAR_FSM = 1102,
  // Messages between BinaryStarApp / controller apps
  BSTAR_GET_APP_DATA = 1103,
  BSTAR_APP_DATA = 1104,
  BSTAR_GET_STATE = 1105,
  // Messages to minion
  BSTAR_SWITCH_CONTROLLER = 1110,

  // == Event Stream == //
  // Topology Events
  EVENT_ADD_NODE = 1201,
  EVENT_DEL_NODE = 1202,
  EVENT_EDIT_NODE = 1203,
  EVENT_ADD_LINK = 1204,
  EVENT_DEL_LINK = 1205,
  EVENT_ADD_SITE = 1206,
  EVENT_DEL_SITE = 1207,
  EVENT_EDIT_SITE = 1208,
  // Status Change Events
  EVENT_NODE_STATUS = 1209,
  EVENT_LINK_STATUS = 1210,

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
  FULL_UPGRADE = 40,
}

/**
 * @apiDefine UpgradeTorrentParams_GROUP
 * @apiParam (:UpgradeTorrentParams) {Int64} downloadTimeout=100
 *           The timeout for downloading the torrent (in seconds)
 * @apiParam (:UpgradeTorrentParams) {Int64} [downloadLimit=-1]
 *           The download bandwidth limit
 *           (in bytes per second, unlimited by default)
 * @apiParam (:UpgradeTorrentParams) {Int64} [uploadLimit=-1]
 *           The upload bandwidth limit
 *           (in bytes per second, unlimited by default)
 * @apiParam (:UpgradeTorrentParams) {Int64} [maxConnections=-1]
 *           The maximum number of connections that the torrent will open
 *           (must be at least 2, unlimited by default)
 */
struct UpgradeTorrentParams {
  1: i64 downloadTimeout; // required. Download timeout
  2: optional i64 downloadLimit = -1;  // Unlimited by default
  3: optional i64 uploadLimit = -1;  // Unlimited by default
  4: optional i64 maxConnections = -1; // Unlimited by default
}

/**
 * @apiDefine UpgradeReq_GROUP
 * @apiParam (:UpgradeReq) {Int(UpgradeReqType)=10,20,30} urType
 *           The upgrade request type
 *           (10=PREPARE_UPGRADE, 20=COMMIT_UPGRADE, 30=RESET_STATUS,
 *            40=FULL_UPGRADE)
 * @apiParam (:UpgradeReq) {String} upgradeReqId
 *           The unique identifier for the upgrade request
 * @apiParam (:UpgradeReq) {String} md5
 *           The expected MD5 hash of the upgrade image file
 *           (only used in prepare/commit)
 * @apiParam (:UpgradeReq) {String} imageUrl
 *           The URI for the upgrade image, which must be either an HTTP/HTTPS
 *           URL or Magnet URI (only used in prepare)
 * @apiParam (:UpgradeReq) {Int64} [scheduleToCommit=0]
 *           The number of seconds before a minion reboots after being flashed
 *           (only used in commit)
 * @apiParam (:UpgradeReq) {Int64=1-10} [downloadAttempts=3]
 *           The maximum number of attempts for a minion to download the upgrade
 *           image (only used in prepare over HTTP/HTTPS)
 * @apiParam (:UpgradeReq) {Object(UpgradeTorrentParams)} [torrentParams]
 *           The torrent parameters (only used in prepare over BitTorrent)
 */
struct UpgradeReq {
  1: UpgradeReqType urType;
  2: string upgradeReqId;
  3: string md5;  // for PREPARE_UPGRADE / COMMIT_UPGRADE
  4: string imageUrl;  // for PREPARE_UPGRADE
  5: optional i64 scheduleToCommit;
  6: optional i64 downloadAttempts;  // for PREPARE_UPGRADE
  7: optional UpgradeTorrentParams torrentParams;  // for PREPARE_UPGRADE
  8: optional string nextNodeConfigJson; // for COMMIT_UPGRADE
}

enum UpgradeGroupType {
  NODES = 10,    // upgrade operation on a list of nodes
  NETWORK = 20,  // upgrade operation on the entire network
}

/**
 * @apiDefine UpgradeGroupReq
 * @apiParam {Int(UpgradeGroupType)=10,20} ugType
 *           Whether to upgrade a list of nodes or the entire network
 *           (10=NODES, 20=NETWORK)
 * @apiParam {String[]} nodes The nodes to upgrade (for node-level upgrades)
 * @apiParam {String[]} excludeNodes The nodes to exclude from the upgrade
 *           (for network-level upgrades)
 * @apiParam {Object(UpgradeReq)} urReq The upgrade request parameters
 * @apiParam {Int64} timeout
 *           The timeout for the entire upgrade operation (in seconds)
 * @apiParam {Boolean} skipFailure
 *           If true, the controller will move on to the next node if the
 *           current node can't be upgraded; if false, it will abort the upgrade
 *           upon seeing a single node failure
 * @apiParam {String} version Skip nodes with this version before prepare/commit
 * @apiParam {String[]} skipLinks Skip the link aliveness check for these links
 *           when updating the commit status
 * @apiParam {Int64} limit Maximum number of nodes to commit simultaneously
 *           (<0 Upgrade all nodes at once;
 *            0 Staged commit with no limit per stage;
 *            >0 Staged commit with limiting number of nodes per stage)
 * @apiParam {Int64} retryLimit=3 The maximum retry attempts for each node
 */
// upgrade request sent to controller to upgrade a group of nodes
struct UpgradeGroupReq {
  1: UpgradeGroupType ugType;
  2: list<string> nodes;
  3: list<string> excludeNodes;
  4: UpgradeReq urReq;
  5: i64 timeout;
  6: bool skipFailure;
  7: string version;
  8: list<string> skipLinks;
  9: i64 limit;
  10: i64 retryLimit = 3;
}

/**
 * @apiDefine UpgradeStateReq
 */
struct UpgradeStateReq {}

/**
 * @apiDefine UpgradeStateDump_SUCCESS
 * @apiSuccess {String[]} curBatch
 *             The names of the nodes currently upgrading
 * @apiSuccess {String[][]} pendingBatches
 *             The batches of nodes pending for the current request
 * @apiSuccess {Object(UpgradeGroupReq)} curReq
 *             The current upgrade group request
 * @apiSuccess {Object(UpgradeGroupReq)[]} pendingReqs
 *             The queued upgrade group requests
 */
struct UpgradeStateDump {
  1: list<string> curBatch;
  2: list<list<string>> pendingBatches;
  3: UpgradeGroupReq curReq;
  4: list<UpgradeGroupReq> pendingReqs;
}

/**
 * @apiDefine UpgradeAbortReq
 * @apiParam {Boolean} abortAll Whether to abort all upgrades
 * @apiParam {String[]} reqIds The request IDs to abort (if abortAll is false)
 */
struct UpgradeAbortReq {
  1: bool abortAll;
  2: list<string> reqIds;
}

/**
 * @apiDefine UpgradeCommitPlanReq
 * @apiParam {Int64} limit The maximum number of nodes per batch
 * @apiParam {String[]} excludeNodes The nodes to exclude from the upgrade
 */
struct UpgradeCommitPlanReq {
  1: i64 limit;
  2: list<string> excludeNodes;
}

/**
 * @apiDefine UpgradeCommitPlan_SUCCESS
 * @apiSuccess (:UpgradeCommitPlan) {Set(String)[]} commitBatches
 *                                 List of commit batches consisting of nodes
 *                                 to upgrade in each batch
 */
typedef list<set<string>>
  (cpp.type = "std::vector<std::unordered_set<std::string>>")
  CommitBatches
struct UpgradeCommitPlan {
  1: CommitBatches commitBatches;
}

/**
 * @apiDefine UpgradeImage_SUCCESS
 * @apiSuccess (:UpgradeImage) {String} name The unique, descriptive image name
 * @apiSuccess (:UpgradeImage) {String} magnetUri The magnet URI for the image
 * @apiSuccess (:UpgradeImage) {String} md5 The MD5 hash of the image
 */
struct UpgradeImage {
  1: string name; // unique, descriptive name for the image (not filename)
  2: string magnetUri; // magnet URI for this image
  3: string md5; // md5 hash (needed for PREPARE_UPGRADE/COMMIT_UPGRADE)
}

/**
 * @apiDefine UpgradeAddImageReq
 * @apiParam {String} imageUrl The HTTP/HTTPS URL of the image to download
 */
struct UpgradeAddImageReq {
  1: string imageUrl; // image http URL (for controller to download)
}

/**
 * @apiDefine UpgradeDelImageReq
 * @apiParam {String} name The name of the upgrade image to delete
 */
struct UpgradeDelImageReq {
  1: string name; // 'name' from UpgradeImage
}

/**
 * @apiDefine UpgradeListImagesReq
 */
struct UpgradeListImagesReq {}

/**
 * @apiDefine UpgradeListImagesResp_SUCCESS
 * @apiSuccess {Object(UpgradeImage)[]} images
 *             The list of images hosted by the controller
 */
struct UpgradeListImagesResp {
  1: list<UpgradeImage> images;
}

############# Config App #############

// Action after setting config
enum CfgAction {
  NO_ACTION = 0,
  REBOOT = 10,
  RESTART_MINION = 20,
  RESTART_STATS_AGENT = 21,
  RESTART_LOGTAIL = 22,
  RESTART_OPENR = 23,
  RESTART_SQUIRE = 24,
  REDO_POP_CONFIG = 25,
  RELOAD_RSYSLOG_CONFIG = 26,
  RESTART_KEA = 27,
  UPDATE_FIREWALL = 28,
  SYNC_LINK_MONITOR = 30,
  INJECT_KVSTORE_KEYS = 31,
  UPDATE_LINK_METRICS = 32,
  UPDATE_GLOG_LEVEL = 40,
  UPDATE_SCAN_CONFIG = 50,
}

// Config parameter data types
enum CfgParamType {
  INTEGER = 10,
  STRING = 20,
  BOOLEAN = 30,
  OBJECT = 40,
  MAP = 50,
  FLOAT = 60,
}

struct GetMinionConfigReq {}

struct GetMinionConfigResp {
  1: string config;
}

struct SetMinionConfigReq {
  1: string config; // node config json string
}

struct GetMinionConfigActionsReq {
  1: string config; // node config json string
  2: string id;
}

struct GetMinionConfigActionsResp {
  // node actions that would be performed
  1: set<CfgAction> (cpp.template = "std::unordered_set") actions;
  2: string id;
}

/**
 * @apiDefine GetCtrlConfigReq
 * @apiParam {String} node The node name
 * @apiParam {String} [swVersion]
 *           The software version to use as the base config.
 *           If this is omitted, the controller will use the last version that
 *           the node reported; if no version is known to the controller, an
 *           error will be returned.
 */
struct GetCtrlConfigReq {
  1: string node;
  2: optional string swVersion; // To determine the config base to use
}

/**
 * @apiDefine GetCtrlConfigResp_SUCCESS
 * @apiSuccess {String} config The full node config (JSON)
 */
struct GetCtrlConfigResp {
  1: string config;
}

/**
 * @apiDefine GetCtrlConfigAutoNodeOverridesReq
 * @apiParam {String[]} nodes The list of nodes, or all nodes if empty
 */
struct GetCtrlConfigAutoNodeOverridesReq {
  1: list<string> nodes; // get for all nodes if empty
}

/**
 * @apiDefine GetCtrlConfigAutoNodeOverridesResp_SUCCESS
 * @apiSuccess {String} overrides The automated node config overrides (JSON)
 */
struct GetCtrlConfigAutoNodeOverridesResp {
  1: string overrides; // Json of node overrides
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
 *           names to their config overrides
 */
struct SetCtrlConfigNodeOverridesReq {
  1: string overrides; // Json of node overrides (maps node name to overrides)
}

/**
 * @apiDefine GetCtrlConfigNodeOverridesActionsReq
 * @apiParam {String} overrides The node config overrides (JSON), mapping node
 *           names to their config overrides
 */
struct GetCtrlConfigNodeOverridesActionsReq {
  1: string overrides; // Json of node overrides (maps node name to overrides)
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
 * @apiParam {String} overrides The network config overrides (JSON)
 */
struct SetCtrlConfigNetworkOverridesReq {
  1: string overrides; // Json of network overrides
}

/**
 * @apiDefine GetCtrlConfigNetworkOverridesActionsReq
 * @apiParam {String} overrides The network config overrides (JSON)
 */
struct GetCtrlConfigNetworkOverridesActionsReq {
  1: string overrides; // Json of network overrides
}

/**
 * @apiDefine GetCtrlConfigOverridesActionsResp_SUCCESS
 * @apiSuccess {String} overrides A copy of the input config overrides (JSON)
 * @apiSuccess {String} id The unique identifier that will be attached to all
 *             associated node reports
 * @apiSuccess {Int64} availableUntil The time (UNIX time) at which the
 *             controller will discard results for this ID
 */
struct GetCtrlConfigOverridesActionsResp {
  1: string overrides; // Json of overrides (either node or network)
  2: string id;
  3: i64 availableUntil; // UNIX time
}

/**
 * @apiDefine GetCtrlConfigActionsResultsReq
 * @apiParam {String} id The ID to query results for
 */
struct GetCtrlConfigActionsResultsReq {
  1: string id;
}

/**
 * @apiDefine NodeConfigActionsResult_SUCCESS
 * @apiSuccess (:NodeConfigActionsResult) {Set(Int(CfgAction))=0,10,20,21,22,23,24,25,30,31,32} actions
 *             The actions this node will take
 *             (0=NO_ACTION, 10=REBOOT, 20=RESTART_MINION,
 *              21=RESTART_STATS_AGENT, 22=RESTART_LOGTAIL,
 *              23=RESTART_OPENR, 24=RESTART_SQUIRE, 25=REDO_POP_CONFIG,
 *              27=RESTART_KEA, 28=UPDATE_FIREWALL, 30=SYNC_LINK_MONITOR,
 *              31=INJECT_KVSTORE_KEYS, 32=UPDATE_LINK_METRICS)
 */
struct NodeConfigActionsResult {
  1: set<CfgAction> (cpp.template = "std::unordered_set") actions;
}

/**
 * @apiDefine GetCtrlConfigActionsResultsResp_SUCCESS
 * @apiSuccess {Map(String:Object(NodeConfigActionsResult))} results
 *             Per-node config actions reports
 */
struct GetCtrlConfigActionsResultsResp {
  1: map<string /* node name */, NodeConfigActionsResult>
     (cpp.template = "std::unordered_map") results;
}

/**
 * @apiDefine GetCtrlConfigMetadata
 */
struct GetCtrlConfigMetadata {}

/**
 * @apiDefine GetCtrlConfigMetadataResp_SUCCESS
 * @apiSuccess {String} metadata The config parameter metadata (JSON)
 */
struct GetCtrlConfigMetadataResp {
  1: string metadata;
}

struct MinionConfigChanged {}

/**
 * @apiDefine GetCtrlControllerConfigReq
 */
struct GetCtrlControllerConfigReq {}

/**
 * @apiDefine GetCtrlControllerConfigResp_SUCCESS
 * @apiSuccess {String} config The controller config (JSON)
 */
struct GetCtrlControllerConfigResp {
  1: string config; // Json of controller config
}

/**
 * @apiDefine SetCtrlControllerConfigReq
 * @apiParam {String} config The controller config (JSON)
 */
struct SetCtrlControllerConfigReq {
  1: string config; // Json of controller config
}

/**
 * @apiDefine GetCtrlControllerConfigMetadata
 */
struct GetCtrlControllerConfigMetadata {}

/**
 * @apiDefine GetCtrlControllerConfigMetadataResp_SUCCESS
 * @apiSuccess {String} metadata The controller config parameter metadata (JSON)
 */
struct GetCtrlControllerConfigMetadataResp {
  1: string metadata;
}

#############  StatusApp ##############

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

enum NodeParamsType {
  INIT = 0,
  GPS = 1,
  NETWORK = 2,
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
  8: NodeParamsType type;
}

/**
 * @apiDefine BgpRouteInfo_SUCCESS
 * @apiSuccess (:BgpRouteInfo) {String} [network] The network's IPv6 address
 * @apiSuccess (:BgpRouteInfo) {String} [nextHop]
 *                             The next hop network's IPv6 address
 */
struct BgpRouteInfo {
  1: string network;
  2: string nextHop;
}

/**
 * @apiDefine BgpInfo_SUCCESS
 * @apiSuccess (:BgpInfo) {String} [ipv6Address] The BGP neighbor's IPv6 address
 * @apiSuccess (:BgpInfo) {Boolean} [online]
 *                        Whether the neighbor is online or not
 * @apiSuccess (:BgpInfo) {Int32} [asn]
 *                        Autonomous System Number
 * @apiSuccess (:BgpInfo) {String} [upDownTime]
 *                        Connection up/down time in hh:mm:ss format
 * @apiSuccess (:BgpInfo) {String} [stateOrPfxRcd]
 *                        If connected, the number of prefixes received,
 *                        otherwise the current state of the neighbor
 * @apiSuccess (:BgpInfo) {Object(BgpRouteInfo)[]} [advertisedRoutes]
 *                        List of advertised routes
 * @apiSuccess (:BgpInfo) {Object(BgpRouteInfo)[]} [receivedRoutes]
                          List of received routes
 */
struct BgpInfo {
  1: string ipv6Address;
  2: bool online;
  3: i32 asn;
  4: string upDownTime;
  5: string stateOrPfxRcd;
  6: list<BgpRouteInfo> advertisedRoutes;
  7: list<BgpRouteInfo> receivedRoutes;
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
 * @apiSuccess (:StatusReport) {String} hardwareModel
 *                             The hardware model
 *                             (from "/proc/device-tree/model")
 * @apiSuccess (:StatusReport) {Map(String:Object(BgpInfo))} bgpStatus
 *                             If this is a POP node, this will contain a map of
 *                             BGP neighbor IPs to summary and route information
 */
 // NOTE: "version", "ubootVersion", and "hardwareModel" will be empty strings
 // after the controller initially learns them.
struct StatusReport {
  1: i64 timeStamp;  // timestamp at which this response was received
  2: string ipv6Address;  // global-reachable IPv6 address for minion
  3: string version; // current minion version obtained from "/etc/version"
  6: string ubootVersion; // uboot version string obtained during startup
  4: Topology.NodeStatusType status; // ignition state of minion
  5: UpgradeStatus upgradeStatus;
  7: string configMd5;
  8: optional bool nodeIsPrimary; // true if node is primary, otherwise false
  9: string hardwareModel; // hardware model from "/proc/device-tree/model"
  // map from bgp neighbor addresses to bgp information for pop nodes
  10: optional map<string /* neighborIp */, BgpInfo>
      (cpp.template = "std::unordered_map") bgpStatus;
}

struct StatusReportAck {
  1: bool requestFullStatusReport;
}

/**
 * @apiDefine GetStatusDump
 */
struct GetStatusDump {}

/**
 * @apiDefine StatusDump_SUCCESS
 * @apiSuccess {Int64} timeStamp
 *             The time at which this response was generated
 * @apiSuccess {Map(String:Object(StatusReport))} statusReports
 *             The per-node status reports
 * @apiSuccess {String} [version]
 *             The controller version sourced from "/etc/version"
 */
struct StatusDump {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: map<string /* node id */, StatusReport>
     (cpp.template = "std::unordered_map") statusReports;
  3: optional string version;
}

struct GetCtrlNeighborsReq {
  // The list of network devices to query for IPv6 neighbors
  1: list<string> devices;
}

struct GetCtrlNeighborsResp {
  // The list of network devices to query for IPv6 neighbors
  1: list<string> devices;
  // The unique identifier that will be attached to all associated node reports
  2: string reqId;
}

// Sent from ctrl to API/CLI after GetCtrlNeighborsResp
struct GetNeighborsResp {
  // Map from devices to a list of ipv6 neighbors on that device
  1: map<string /* device */, list<MinionNeighbor>>
     (cpp.template = "std::unordered_map") deviceNeighborsMap;
  // The unique identifier that will be attached to all associated node reports
  2: string reqId;
  // Minion mac addr that sends this response
  4: string minion;
}

// States from ip-neighbour(8) man page
enum MinionNeighborState {
  PERMANENT = 0,
  NOARP = 1,
  REACHABLE = 2,
  STALE = 3,
  NONE = 4,
  INCOMPLETE = 5,
  DELAY = 6,
  PROBE = 7,
  FAILED = 8,
  UNKNOWN = 9, // Default in case parsing the neighbors goes wrong
}

// Represents a single ipv6 neighbor
struct MinionNeighbor {
  1: string ipv6Address;
  2: string macAddr;
  3: MinionNeighborState state;
}

struct GetMinionNeighborsReq {
  // The list of network devices to query for IPv6 neighbors
  1: list<string> devices;
  // The unique identifier that will be attached to all associated node reports
  2: string reqId;
  // App/zmq socket that sent the original GetCtrlNeighborsReq
  3: string senderApp;
}

// Sent back from minion to ctrl
struct GetMinionNeighborsResp {
  // Map from devices to a list of ipv6 neighbors on that device
  1: map<string /* device */, list<MinionNeighbor>>
     (cpp.template = "std::unordered_map") deviceNeighborsMap;
  // The unique identifier that will be attached to all associated node reports
  2: string reqId;
  // App/zmq socket that sent the original GetCtrlNeighborsReq
  3: string senderApp;
}

struct UpdateLinkMetrics {}

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
  4: optional map<string /* link name */, bool>
     (cpp.template = "std::unordered_map") linkAutoIgnite;
}

/**
 * @apiDefine SetLinkStatusReq
 * @apiParam {Int(LinkActionType)=1,2} action
 *           The link update action (1=LINK_UP, 2=LINK_DOWN)
 * @apiParam {String} initiatorNodeName The initiator node
 * @apiParam {String} responderNodeName The responder node
 */
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
 * @apiSuccess {Object(IgnitionCandidate)[]} igCandidates
 *             The ignition candidates
 * @apiSuccess {Object(IgnitionCandidate)[]} lastIgCandidates
 *             The last ignition candidates
 * @apiSuccess {Object(IgnitionParams)} igParams The ignition parameters
 */
struct IgnitionState {
  // 1: (deprecated)
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
  7: string initiatorMac; // initiator mac address
}

// GetLinkStatus messge sent from controller to minion on node
struct GetLinkStatus {
  1: string responderMac; // responder mac address
}

// Link Status message sent from minion (initiator/responder) to
// controller (TopologyApp) indicates link status change:
// LINK_UP / LINK_DOWN (LINK_PAUSE)
struct LinkStatus {
  1: string responderMac; // mac address of the other end of link
  2: LinkStatusType linkStatusType; // whether link is up or down
}

// Link Status event forwarded from controller TopologyApp to IgnitionApp
struct LinkStatusEvent {
  1: string linkName;
  2: LinkStatusType linkStatusType;
}

#############  TopologyApp ##############

/**
 * @apiDefine GetTopology
 */
struct GetTopology {}

/**
 * @apiDefine GetNetworkAirtime
 */
struct GetNetworkAirtime {}

struct SetNodeStatus {
  1: string nodeMac;
  2: Topology.NodeStatusType nodeStatus;
}

struct SetNodeParamsReq {
  1: string nodeMac;
  2: optional BWAllocation.NodeAirtime nodeAirtime;
  3: optional BWAllocation.NodeBwAlloc nodeBWAlloc;
  4: optional bool nodeIsPrimary;
}

struct SetNetworkParamsReq {
  1: optional BWAllocation.NetworkAirtime networkAirtime;
  2: optional BWAllocation.NetworkBwAlloc networkBWAlloc;
  3: optional byte channel;
}

/**
 * @apiDefine SetNodeMac
 * @apiParam {String} nodeName The node name
 * @apiParam {String} nodeMac The primary MAC address to set
 * @apiParam {String[]} nodeSecondaryMacs
 *           The secondary MAC addresses of any other RFs to set
 * @apiParam {Boolean} force Force set
 */
/**
 * @apiDefine SetNodeMac_GROUP
 * @apiParam (:SetNodeMac) {String} nodeName The node name
 * @apiParam (:SetNodeMac) {String} nodeMac The primary MAC address to set
 * @apiParam (:SetNodeMac) {String[]} nodeSecondaryMacs
 *                         The secondary MAC addresses of any other RFs to set
 * @apiParam (:SetNodeMac) {Boolean} force Force set
 */
struct SetNodeMac {
  1: string nodeName;
  2: string nodeMac;
  // numbering is intentional
  4: list<string> nodeSecondaryMacs;
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

/**
 * @apiDefine EditNode
 * @apiParam {String} nodeName The node name
 * @apiParam {Object(Node)} newNode The new node parameters
 */
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

/**
 * @apiDefine EditSite
 * @apiParam {String} siteName The site name
 * @apiParam {Object(Site)} newSite The new site parameters
 */
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

/**
 * @apiDefine GetRoutes
 * @apiParam {String} srcNode The source node name
 * @apiParam {String} dstNode The destination node name
 */
struct GetRoutes {
  1: string srcNode;
  2: string dstNode;
}

/**
 * @apiDefine GetRoutesResp_SUCCESS
 * @apiSuccess {String[][]} routes
 *              The list of routes between the source and destination nodes
 */
struct GetRoutesResp {
  1: list<list<string /* node name */>> routes;
}

/**
 * @apiDefine GetNodePrefixes
 */
struct GetNodePrefixes {}

/**
 * @apiDefine GetZonePrefixes
 */
struct GetZonePrefixes {}

/**
 * @apiDefine GetZonePrefixesResp_SUCCESS
 * @apiSuccess (:GetZonePrefixesResp) {Map(String:Set(String)} zonePrefixes
 *             Map of site names to zone prefixes
 */
struct GetZonePrefixesResp {
  1: map<
        string /* site name */,
        set<string> (cpp.template = "std::unordered_set")>
     (cpp.template = "std::unordered_map") zonePrefixes;
}

/**
 * @apiDefine GetNodePrefixesResp_SUCCESS
 * @apiSuccess (:GetNodePrefixesResp) {Map(String:String} nodePrefixes
 *             Map of node names to their assigned prefixes
 */
struct GetNodePrefixesResp {
  1: map<string /* node name */, string /* prefix */>
     (cpp.template = "std::unordered_map") nodePrefixes;
}

/**
 * @apiDefine AllocatePrefixes
 */
struct AllocatePrefixes {}

// openr local adjacency response back to fw
struct FwAdjResp {
  1: map<string, string> (cpp.template = "std::unordered_map") adjs;
}

############# Scan App #############

/**
 * @apiDefine MicroRoute_SUCCESS
 * @apiSuccess (:MicroRoute) {Int16} tx
 *             The transmit beamforming index of the micro-route
 * @apiSuccess (:MicroRoute) {Int16} rx
 *             The receive beamforming index of the micro-route
 */
// transmit and receive beamforming indices of a micro route
struct MicroRoute {
  1: i16 tx;
  2: i16 rx;
}

/**
 * @apiDefine RouteInfo_SUCCESS
 * @apiSuccess (:RouteInfo) {Object(MicroRoute)} route
 *             The beamforming indices of the micro-route
 * @apiSuccess (:RouteInfo) {Double} rssi
 *             The received signal strength indicator (RSSI), in dBm
 * @apiSuccess (:RouteInfo) {Double} snrEst
 *             The signal-to-noise ratio (SNR) measured during the short
 *             training field, in dB
 * @apiSuccess (:RouteInfo) {Double} postSnr
 *             The signal-to-noise ratio (SNR) measured after the equalizer,
 *             in dB
 * @apiSuccess (:RouteInfo) {Int32} rxStart
 *             The relative arrival time of the packet, in microseconds
 * @apiSuccess (:RouteInfo) {Byte} packetIdx
 *             The repeat count of this packet (0-based)
 * @apiSuccess (:RouteInfo) {Int16} sweepIdx
 *             The sweep index of the packet (0-based)
 */
// individual micro-route measurement/report
struct RouteInfo {
  1: MicroRoute route; // beamforming indices of micro route
  2: double rssi;      // received signal strength, in dBm
  3: double snrEst;    // measured during the short training field, in dB
  4: double postSnr;   // measured after the equalizer, in dB
  5: i32 rxStart;      // relative arrival time of the packet, in us
  6: byte packetIdx;   // Repeat count of this packet, 0-based
  7: i16 sweepIdx;     // Sweep index for the packet, 0-based
}

enum ScanType {
  PBF = 1,      // Periodic beamforming
  IM = 2,       // Interference measurement
  RTCAL = 3,    // Runtime calibration
  CBF_TX = 4,   // Coordinated beamforming (aka interference nulling), tx side
  CBF_RX = 5,   // Same, rx side
  TOPO = 6,     // Topology_scan
}

enum ScanMode {
  COARSE = 1,
  FINE = 2,
  SELECTIVE = 3,
  RELATIVE = 4, // Relative to the last Azimuth beam selected by FW
}

// SubType for Runtime Calibration and CBF
enum ScanSubType {
  NO_CAL = 0, // No calibration, init state
  TOP_RX_CAL = 1, // Top Panel, responder Rx cal with fixed intiator Tx beam
  TOP_TX_CAL = 2, // Top Panel, intiator Tx cal with fixed responder Rx beam
  BOT_RX_CAL = 3, // Bot Panel, responder Rx cal with fixed intiator Tx beam
  BOT_TX_CAL = 4, // Bot Panel, intiator Tx cal with fixed responder Rx beam
  VBS_RX_CAL = 5, // Top + Bot, responder Rx cal with fixed intiator Tx beam
  VBS_TX_CAL = 6, // Top + Bot, intiator Tx cal with fixed responder Rx beam
  RX_CBF_AGGRESSOR = 7, // RX Coordinated BF Nulling, Aggressor link
  RX_CBF_VICTIM = 8,    // RX Coordinated BF Nulling, Victim link
  TX_CBF_AGGRESSOR = 9, // TX Coordinated BF Nulling, Aggressor link
  TX_CBF_VICTIM = 10,   // TX Coordinated BF Nulling, Victim link
}

enum ScanFwStatus {
  COMPLETE = 0,
  INVALID_TYPE = 1,
  INVALID_START_TSF = 2,
  INVALID_STA = 3,
  AWV_IN_PROG = 4,
  STA_NOT_ASSOC = 5,
  REQ_BUFFER_FULL = 6,
  LINK_SHUT_DOWN = 7,
  UNSPECIFIED_ERROR = 8,
  UNEXPECTED_ERROR = 9,
  EXPIRED_TSF = 10,
  INCOMPL_RTCAL_BEAMS_FOR_VBS = 11,
}

/**
 * @apiDefine BeamIndices_GROUP
 * @apiParam (:BeamIndices) {Int32} low The low beam index
 * @apiParam (:BeamIndices) {Int32} high The high beam index
 */
struct BeamIndices {
  1: i32 low;
  2: i32 high;
}

struct ScanReq {
  1: i32 token; // token to match request to response
  13: optional ScanType scanType;
  2: ScanMode scanMode; // scan mode
  3: i64 startBwgdIdx; // start time of scan in BWGD index
  4: bool bfScanInvertPolarity; // Invert Polarity when using with same
                                // Polarity peer
  5: optional string txNodeMac; // tx node id (only present for receivers)
  6: optional string rxNodeMac; // broadcast or specific node (for tx only)
  7: optional list<MicroRoute> routes; // for partial scan, absent for full scan
  8: optional BeamIndices beams; // Beam indices range
  9: optional bool apply; // 1 - Apply new beams, 0 - ignore new beams
  // These are for selective scan
  10: optional ScanSubType subType;
  11: optional byte bwgdLen;

  // This is to control tx power
  12: optional i16 txPwrIndex; // tx power index (0 - 31)

  // For CBF scans
  14: optional i16 nullAngle;
  15: optional i16 cbfBeamIdx;
  16: optional bool isAggressor;  // victim if false
}

/**
 * @apiDefine TopoResponderInfo_SUCCESS
 * @apiSuccess (:TopoResponderInfo) {String} addr
 *             The MAC address of the responder
 * @apiSuccess (:TopoResponderInfo) {Object(Location)} [pos]
 *             The GPS position of the responder
 * @apiSuccess (:TopoResponderInfo) {Map(Int16:Map(Int16:Int16))} [itorLqmMat]
 *             The I-to-R uRoute link quality metric (LQM) matrix
 * @apiSuccess (:TopoResponderInfo) {Map(Int16:Map(Int16:Int16))} [rtoiLqmMat]
 *             The R-to-I uRoute link quality metric (LQM) matrix
 * @apiSuccess (:TopoResponderInfo) {Set(String)} [adjs]
 *             The set of local adjacencies at the responder
 */
// The responder information in topology scans
struct TopoResponderInfo {
  1: string addr;
  2: optional Topology.Location pos;
  3: map<i16, map<i16, i16> (cpp.template = "std::unordered_map")>
     (cpp.template = "std::unordered_map") itorLqmMat;
  4: map<i16, map<i16, i16> (cpp.template = "std::unordered_map")>
     (cpp.template = "std::unordered_map") rtoiLqmMat;
  5: set<string> (cpp.template = "std::unordered_set") adjs;
}

/**
 * @apiDefine ScanResp_SUCCESS
 * @apiSuccess (:ScanResp) {Int32} token
 *             The token used to match the request to the response
 * @apiSuccess (:ScanResp) {Int64} curSuperframeNum
 *             The superframe number, as a timestamp of the measurement
 * @apiSuccess (:ScanResp) {Object(RouteInfo)[]} routeInfoList
 *             The list of routes
 * @apiSuccess (:ScanResp) {Int16} [txPwrIndex]
 *             The transmit power index used for the scan (0-31)
 * @apiSuccess (:ScanResp) {Int(ScanFwStatus)} status
 *             The scan status (0: complete, >=1: failure)
 * @apiSuccess (:ScanResp) {Int16} [numSweeps]
 *             The number of times that beams were scanned
 * @apiSuccess (:ScanResp) {Int64} [startSuperframeNum]
 *             The start of the BF slot allocation
 * @apiSuccess (:ScanResp) {Int64} [endSuperframeNum]
 *             The end of the BF slot allocation
 * @apiSuccess (:ScanResp) {Int16} [azimuthBeam]
 *             The beam selected from the golden codebook during initial BF or
 *             PBF
 * @apiSuccess (:ScanResp) {Int16} [oldBeam]
 *             The old beam (used by RTCAL, VBS, and CBF)
 * @apiSuccess (:ScanResp) {Int16} [newBeam]
 *             The resultant beam
 * @apiSuccess (:ScanResp) {Int16} [sweepStartBeam]
 *             The sweep start beam
 * @apiSuccess (:ScanResp) {Int16} [sweepEndBeam]
 *             The sweep end beam
 * @apiSuccess (:ScanResp) {Map(Int16:Object(TopoResponderInfo))} [topoResps]
 *             The map of responders to topology scan results
 *             (responderIndex:info)
 */
struct ScanResp {
   1: i32 token;
   2: i64 curSuperframeNum;
   3: list<RouteInfo> routeInfoList;
   4: optional i16 txPwrIndex;
   5: ScanFwStatus status;
   7: optional i16 numSweeps;
   8: optional i64 startSuperframeNum;
   9: optional i64 endSuperframeNum;
   10: optional i16 azimuthBeam;
   11: optional i16 oldBeam;
   12: optional i16 newBeam;
   13: optional i16 sweepStartBeam;
   14: optional i16 sweepEndBeam;
   15: optional map<i16 /* Responder index */, TopoResponderInfo>
       (cpp.template = "std::unordered_map") topoResps;
}

/**
 * @apiDefine StartScan
 * @apiParam {Int(ScanType)} scanType
 *           The scan type (1=PBF, 2=IM, 3=RTCAL, 4=CBF_TX, 5=CBF_RX, 6=TOPO)
 * @apiParam {Int(ScanMode)} scanMode
 *           The scan mode (1=COARSE, 2=FINE, 3=SELECTIVE, 4=RELATIVE)
 * @apiParam {Int64} startTime
 *           The scan start time (UNIX time)
 * @apiParam {String} [txNode]
 *           The transmitter node.
 *           If present, run the scan on transmitter-to-receiver links.
 *           Otherwise, run an IM scan on the whole network.
 * @apiParam {String[]} [rxNodes]
 *           The receiver nodes.
 *           This should be present if and only if txNode is given.
 *           For PBF/RTCAL, this list should contain a single node.
 * @apiParam {Object(BeamIndices)[]} [beams]
 *           The beam indices for every node (the transmitter and all
 *           receivers, in that order). If unset, use the default indices.
 * @apiParam {Boolean} [apply]
 *           Whether to apply the new beams after the procedure (true) or
 *           ignore them (false)
 * @apiParam {Int(ScanSubType)} [subType]
 *           The scan subtype (used in CBF/RTCAL)
 * @apiParam {Byte} [bwgdLen]
 *           The calibration length in BWGDs (2-64)
 * @apiParam {Int16} [txPwrIndex]
 *           The transmit power index (0-31, 255=current average power).
 * @apiParam {String} [mainTxNode]
 *           The main transmitter node
 *           (victim for CBF_RX, aggressor for CBF_TX)
 * @apiParam {String} [mainRxNode]
 *           The main receiver node
 *           (victim for CBF_RX, aggressor for CBF_TX)
 * @apiParam {String[]} [auxTxNodes]
 *           The auxiliary transmitter nodes (for CBF) -
 *           should be of the same length as auxRxNodes
 * @apiParam {String[]} [auxRxNodes]
 *           The auxiliary receiver nodes (for CBF) -
 *           should be of the same length as auxTxNodes
 * @apiParam {Int16[]} [auxTxPwrIndex]
 *           The transmit power indicies of auxTxNodes (for CBF)
 * @apiParam {Int16} [nullAngle]
 *           The nulling angle (for CBF)
 * @apiParam {Int16} [cbfBeamIdx]
 *           The beam index (for CBF)
 * @apiParam {Boolean} [setConfig]
 *           If true, set CBF config for a link instead of actually executing
 *           a one-time scan
 */
struct StartScan {
  1: ScanType scanType;
  2: ScanMode scanMode;
  3: i64 startTime;
  4: optional string txNode;
  5: optional list<string> rxNodes;
  6: optional list<BeamIndices> beams;
  7: optional bool apply;
  8: optional ScanSubType subType;
  9: optional byte bwgdLen;
  10: optional i16 txPwrIndex;
  // For CBF TX/RX
  11: optional string mainTxNode; // vtx for CBF_RX, atx for CBF_TX
  12: optional string mainRxNode; // vrx for CBF_RX, arx for CBF_TX
  // The lists should be of equal lengths
  13: optional list<string> auxTxNodes; // atx for CBF_RX, vtx for CBF_TX
  14: optional list<string> auxRxNodes; // arx for CBF_RX, vrx for CBF_TX
  15: optional list<i16> auxTxPwrIndex;
  16: optional i16 nullAngle;
  17: optional i16 cbfBeamIdx;
  18: optional bool setConfig; // 0 - One-time scan, 1 - update config
}

struct CbfConfig {
  1: map<string, StartScan> (cpp.template = "std::unordered_map") config;
}

struct RfImData {
  // (TX beam, RX beam) -> scaled pathloss (RX SNR for TX power 0)
  // Beams are bitpacked as: RX beam in key[31:16], TX beam in key[15:0]
  1: map<i32, double> (cpp.template = "std::unordered_map") routes;
  2: i32 scanId;
  3: i16 scanPower;
  4: i16 bestTxBeam;
  5: i16 bestRxBeam;
}

struct RfLinkState {
  1: i16 txBeam;
  2: i16 rxBeam;
  3: i16 txPower;
}

struct RfState {
  1: map<string, RfImData> (cpp.template = "std::unordered_map") im;
  2: map<string, RfLinkState> (cpp.template = "std::unordered_map") link;
  3: bool dirty;
}

/**
 * @apiDefine GetScanStatus
 * @apiParam {Boolean} isConcise If true, only metadata will be returned
 *           (without RSSI and SNR measurements)
 * @apiParam {Int32} [tokenFrom] The start of the token range; if omitted,
 *           returns the full scan results. if tokenTo
 *           is not specified, returns only token == tokenFrom
 * @apiParam {Int32} [tokenTo] The end of the token range, inclusive (must also
 *           specify tokenFrom); if omitted, takes the value of tokenFrom
 * @apiParam {Int32} [respIdFrom] The start of the respId range (must also
 *           specify respIdTo) (if specified, ignore tokenFrom); if respIdTo
 *           is not specified, returns only respId == respIdFrom
 * @apiParam {Int32} [respIdTo] The end of the respId range inclusive (must also
 *           specify respIdFrom); if oldest respId > respIdTo; will return
 *           the oldest scan result corresponding to the oldest respId
 *           (if specified, ignore tokenTo)
 */
struct GetScanStatus {
  1: bool isConcise;
  2: optional i32 tokenFrom;
  3: optional i32 tokenTo;
  4: optional i32 respIdFrom;
  5: optional i32 respIdTo;
}

/**
 * @apiDefine ResetScanStatus
 */
struct ResetScanStatus {
  1: optional i64 junk;
}

/**
 * @apiDefine ScanData_SUCCESS
 * @apiSuccess (:ScanData) {Map(String:Object(ScanResp))} responses
 *             The scan responses (node:response)
 * @apiSuccess (:ScanData) {String} txNode The transmitter node
 * @apiSuccess (:ScanData) {Int64} startBwgdIdx
 *             The starting bandwidth grant duration (BWGD) index
 * @apiSuccess (:ScanData) {Int(ScanType)} type
 *             The scan type (1=PBF, 2=IM, 3=RTCAL, 4=CBF_TX, 5=CBF_RX, 6=TOPO)
 * @apiSuccess (:ScanData) {Int(ScanSubType)} [subType]
 *             The scan subtype (used in CBF/RTCAL)
 * @apiSuccess (:ScanData) {Int(ScanMode)} mode
 *             The scan mode (1=COARSE, 2=FINE, 3=SELECTIVE, 4=RELATIVE)
 * @apiSuccess (:ScanData) {Boolean} [apply]
 *             Whether to apply the new beams after the procedure (true) or
 *             ignore them (false)
 * @apiSuccess (:ScanData) {Int16} [nResponsesWaiting]
 *             The number of node responses still outstanding
 * @apiSuccess (:ScanData) {Int32} respId
 *             The response ID - increments when all responses are received
 * @apiSuccess (:ScanData) {String} [mainTxNode]
 *             The main transmitter node
 *             (victim for CBF_RX, aggressor for CBF_TX)
 * @apiSuccess (:ScanData) {String} [mainRxNode]
 *             The main receiver node
 *             (victim for CBF_RX, aggressor for CBF_TX)
 * @apiSuccess (:ScanData) {String[]} [auxTxNodes]
 *             The auxiliary transmitter nodes (for CBF) -
 *             should be of the same length as auxRxNodes
 * @apiSuccess (:ScanData) {String[]} [auxRxNodes]
 *             The auxiliary receiver nodes (for CBF) -
 *             should be of the same length as auxTxNodes
 * @apiSuccess (:ScanData) {Int16} [nullAngle]
 *             The nulling angle (for CBF)
 * @apiSuccess (:ScanData) {Int16} [cbfBeamIdx]
 *             The beam index (for CBF)
 */
// Data collected from a single scan.
// Filled in incrementally, as responses arrive.
struct ScanData {
  1: map<string /* nodename */, ScanResp>
     (cpp.template = "std::unordered_map") responses;
  2: string txNode;
  3: i64 startBwgdIdx;
  4: ScanType type;
  5: optional ScanSubType subType;
  6: ScanMode mode;
  7: optional bool apply;
  8: optional i16 nResponsesWaiting;
  9: i32 respId;
  10: optional string mainTxNode;
  11: optional string mainRxNode;
  // The lists should be of equal lengths
  12: optional list<string> auxTxNodes;
  13: optional list<string> auxRxNodes;
  14: optional i16 nullAngle;
  15: optional i16 cbfBeamIdx;
}

/**
 * @apiDefine ScanStatus_SUCCESS
 * @apiSuccess {Map(Int32:Object(ScanData))} scans The scan data (token:data)
 */
struct ScanStatus {
  1: map<i32 /* token */, ScanData> scans;
}

struct GetCbfConfig {}

struct SetCbfConfig {}

struct ResetCbfConfig {}

struct GetRfState {}

struct SetRfState {
  1: optional RfState rfState;
  2: optional ScanStatus scanStatus;
}

struct ResetRfState {}

/**
 * @apiDefine ScanSchedule
 * @apiParam {Int32} [imScanTimeoutSec]
 *           The interval between periodic IM scans (in seconds)
 * @apiParam {Int32} [combinedScanTimeoutSec]
 *           The interval between periodic combined scans (in seconds)
 * @apiParam {Boolean} pbfEnable Whether PBF is enabled for combined scans
 * @apiParam {Boolean} rtcalEnable Whether RTCAL is enabled for combined scans
 * @apiParam {Boolean} cbfEnable Whether CBF is enabled for combined scans
 */
struct ScanSchedule {
  1: optional i32 imScanTimeoutSec;
  2: optional i32 combinedScanTimeoutSec;
  // 3 (deprecated)
  4: bool pbfEnable;
  5: bool rtcalEnable;
  6: bool cbfEnable;
}

/**
 * @apiDefine GetScanSchedule
 */
struct GetScanSchedule {}

/**
 * @apiDefine GetScanScheduleResp_SUCCESS
 * @apiSuccess {Object(ScanSchedule)} scanSchedule The scan schedule
 * @apiSuccess {Int64} nextBwgdIdx
 *             The BWGD at which combined scans that are already scheduled
 *             will finish
 */
struct GetScanScheduleResp {
  1: ScanSchedule scanSchedule;
  2: i64 nextBwgdIdx;
}

struct ScanScheduleUpdated {}

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
  SP_HYBRID_PBF = 6,
}

struct SlotMapConfig {
  1: i32 slotLen; // in BWGDs
  2: i32 periodLen; // in slots
  // List of permissible slots per purpose/app
  3: map<SlotPurpose, list<Slot>> (cpp.template = "std::unordered_map") mapping;
}

############# OpenrClient App #############

struct SyncLinkMonitor {}

struct InjectKvStoreKeys {}

/**
 * @apiDefine GetRoutingAdjacencies
 */
struct GetRoutingAdjacencies {}

/**
 * @apiDefine RoutingAdjacencies_SUCCESS
 * @apiSuccess {Map(String:Object(AdjacencyDatabase)} adjacencyMap
 *             The adjacency map (nodeId:adjacencyDb)
 * @apiSuccess {Map(String:Object(PrefixDatabase)} prefixMap
 *             The prefix map (nodeId:prefixDb)
 */
struct RoutingAdjacencies {
  1: map<string /* node id */, Lsdb.AdjacencyDatabase>
     (cpp.template = "std::unordered_map") adjacencyMap;
  2: map<string /* node id */, Lsdb.PrefixDatabase>
     (cpp.template = "std::unordered_map") prefixMap;
}

struct SetLinkMetric {
  1: map<string /* mac */, i32 /* metric */> linkMetricMap;
}

############# TrafficApp ##############

// Protocol numbers:
// https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
enum IperfTransportProtocol {
  TCP = 6,
  UDP = 17,
}

enum IperfFormat {
  KILOBITS = 1,
  MEGABITS = 2,
  GIGABITS = 3,
  KILOBYTES = 4,
  MEGABYTES = 5,
  GIGABYTES = 6,
}

/**
 * @apiDefine IperfOptions_GROUP
 * @apiParam (:IperfOptions) {Int64} [bitrate]
 *           The target traffic bitrate (bps)
 * @apiParam (:IperfOptions) {Int32} [timeSec]
 *           The measurement duration (in seconds)
 * @apiParam (:IperfOptions) {Int(IperfTransportProtocol)=6,17} [protocol]
 *           The transport protocol (6=TCP, 17=UDP)
 * @apiParam (:IperfOptions) {Int32} [intervalSec]
 *           The interval between periodic bandwidth reports (in seconds)
 * @apiParam (:IperfOptions) {Int64} [windowSize] The window size (in bytes)
 * @apiParam (:IperfOptions) {Int32} [mss]
 *           The TCP maximum segment size (MTU - 40 bytes)
 * @apiParam (:IperfOptions) {Boolean} [noDelay] Disable Nagle's Algorithm
 * @apiParam (:IperfOptions) {Int32} [omitSec]
 *           Omit the first n seconds of the measurement
 * @apiParam (:IperfOptions) {Boolean} [verbose] Show more detailed output
 * @apiParam (:IperfOptions) {Boolean} [json] Output in JSON format
 * @apiParam (:IperfOptions) {Int64} [bufferLength] The buffer length (in bytes)
 * @apiParam (:IperfOptions) {Int(IperfFormat)=1,2,3,4,5,6} [format]
 *           The format to report (1=KILOBITS, 2=MEGABITS, 3=GIGABITS,
 *           4=KILOBYTES, 5=MEGABYTES, 6=GIGABYTES)
 */
struct IperfOptions {
  1: optional i64 bitrate;
  2: optional i32 timeSec;
  3: optional IperfTransportProtocol protocol;
  4: optional i32 intervalSec;
  5: optional i64 windowSize;
  6: optional i32 mss;
  7: optional bool noDelay;
  8: optional i32 omitSec;
  9: optional bool verbose;
  10: optional bool json;
  11: optional i32 bufferLength;
  12: optional IperfFormat format;
}

/**
 * @apiDefine StartIperf
 * @apiParam {String} srcNodeId The source node MAC address
 * @apiParam {String} dstNodeId The destination node MAC address
 * @apiParam {String} [dstNodeIpv6] The destination node IPv6 address
 * @apiParam {Object(IperfOptions)} [options] The iperf options
 * @apiParam {Boolean} [useLinkLocal]
 *           Whether to use the link-local IP address and interface
 */
/**
 * @apiDefine StartIperf_SUCCESS
 * @apiSuccess (:StartIperf) {String} srcNodeId The source node MAC address
 * @apiSuccess (:StartIperf) {String} dstNodeId The destination node MAC address
 * @apiSuccess (:StartIperf) {String} [dstNodeIpv6] The destination node IPv6 address
 * @apiSuccess (:StartIperf) {Object(IperfOptions)} [options] The iperf options
 * @apiSuccess (:StartIperf) {Boolean} [useLinkLocal]
 *             Whether to use the link-local IP address and interface
 */
struct StartIperf {
  1: string srcNodeId;
  2: string dstNodeId;
  3: optional string dstNodeIpv6;
  4: optional IperfOptions options;
  5: optional bool useLinkLocal;
}

/**
* @apiDefine StartIperfResp_SUCCESS
* @apiSuccess {String} id The unique ID for this iperf session
*/
struct StartIperfResp {
  1: string id;
}

/**
 * @apiDefine StartMinionIperf_SUCCESS
 * @apiSuccess (:StartMinionIperf) {Object(StartIperf)} iperfConfig
 *                                 The iperf config
 * @apiSuccess (:StartMinionIperf) {Int32} serverPort The server port
 * @apiSuccess (:StartMinionIperf) {String} id The iperf session ID
 * @apiSuccess (:StartMinionIperf) {String} senderApp
 *                                 The ZMQ identity of the original sender
 *                                 (empty in response to sender)
 * @apiSuccess (:StartMinionIperf) {String} [iface] The interface to use
 */
struct StartMinionIperf {
  1: StartIperf iperfConfig;
  2: i32 serverPort = 0;
  3: string id;
  4: string senderApp;
  5: optional string iface;
}

/**
 * @apiDefine StopIperf
 * @apiParam {String} id The iperf session ID
 */
struct StopIperf {
  1: string id;
}

/**
 * @apiDefine GetIperfStatus
 */
struct GetIperfStatus {}

/**
 * @apiDefine IperfStatus_SUCCESS
 * @apiSuccess {Map(String:Object(StartMinionIperf))} sessions
 *             The iperf sessions in progress, keyed by session ID
 */
struct IperfStatus {
  1: map<string /* id */, StartMinionIperf>
     (cpp.template = "std::unordered_map") sessions;
}

struct IperfOutput {
  1: string output;
  2: StartMinionIperf startIperf;
  3: bool isServer;
}

/**
 * @apiDefine PingOptions_GROUP
 * @apiParam (:PingOptions) {Boolean} [adaptive] Adaptive ping
 * @apiParam (:PingOptions) {Int32} [count]
 *           Stop after sending count ECHO_REQUEST packets
 * @apiParam (:PingOptions) {Boolean} [timestamp]
 *           Print timestamp before each line
 * @apiParam (:PingOptions) {Boolean} [flood] Flood ping
 * @apiParam (:PingOptions) {Int32} [interval]
 *           Wait interval seconds between sending each packet
 * @apiParam (:PingOptions) {Int32} [preload]
 *           Sends this many packets not waiting for a reply
 * @apiParam (:PingOptions) {Boolean} [numeric] Numeric output only
 * @apiParam (:PingOptions) {Boolean} [outstanding]
 *           Report outstanding ICMP ECHO reply before sending next packet
 * @apiParam (:PingOptions) {Boolean} [quiet] Quiet output
 * @apiParam (:PingOptions) {Int32} [packetSize]
 *           Specifies the number of data bytes to be sent
 * @apiParam (:PingOptions) {Int32} [sndbuf] Set socket sndbuf
 * @apiParam (:PingOptions) {Int32} [ttl] Set the IP time-to-live
 * @apiParam (:PingOptions) {Boolean} [verbose] Verbose output
 * @apiParam (:PingOptions) {Int32} [deadline]
 *           Seconds before exit regardless of how many packets sent or received
 * @apiParam (:PingOptions) {Int32} [timeout]
 *           Time to wait for a response, in seconds
 */
struct PingOptions {
  1: optional bool adaptive;
  2: optional i32 count;
  3: optional bool timestamp;
  4: optional bool flood;
  5: optional i32 interval;
  6: optional i32 preload;
  7: optional bool numeric;
  8: optional bool outstanding;
  9: optional bool quiet;
  10: optional i32 packetSize;
  11: optional i32 sndbuf;
  12: optional i32 ttl;
  13: optional bool verbose;
  14: optional i32 deadline;
  15: optional i32 timeout;
}

/**
 * @apiDefine StartPing
 * @apiParam {String} srcNodeId The source node MAC address
 * @apiParam {String} [dstNodeId] The destination node MAC address
 * @apiParam {String} [dstNodeIpv6] The destination node IPv6 address
 * @apiParam {Object(PingOptions)} [options] The ping options
 * @apiParam {Boolean} [useLinkLocal]
 *           Whether to use the link-local IP address and interface
 */
/**
 * @apiDefine StartPing_SUCCESS
 * @apiSuccess (:StartPing) {String} srcNodeId The source node MAC address
 * @apiSuccess (:StartPing) {String} [dstNodeId] The destination node MAC address
 * @apiSuccess (:StartPing) {String} [dstNodeIpv6] The destination node IPv6 address
 * @apiSuccess (:StartPing) {Object(PingOptions)} [options] The ping options
 * @apiSuccess (:StartPing) [useLinkLocal]
 *             Whether to use the link-local IP address and interface
 */
struct StartPing {
  1: string srcNodeId;
  2: optional string dstNodeId;
  3: optional string dstNodeIpv6;
  4: optional PingOptions options;
  5: optional bool useLinkLocal;
}

/**
* @apiDefine StartPingResp_SUCCESS
* @apiSuccess {String} id The unique ID for this ping session
*/
struct StartPingResp {
  1: string id;
}

/**
 * @apiDefine StartMinionPing_SUCCESS
 * @apiSuccess (:StartMinionPing) {Object(StartPing)} pingConfig The ping config
 * @apiSuccess (:StartMinionPing) {Int32} serverPort The server port
 * @apiSuccess (:StartMinionPing) {String} id The ping session ID
 * @apiSuccess (:StartMinionPing) {String} senderApp
 *                                The ZMQ identity of the original sender
 *                                (empty in response to sender)
 * @apiSuccess (:StartMinionPing) {String} [iface] The interface to use
 */
struct StartMinionPing {
  1: StartPing pingConfig;
  2: string id;
  3: string senderApp;
  4: optional string iface;
}

/**
 * @apiDefine StopPing
 * @apiParam {String} id The ping session ID
 */
struct StopPing {
  1: string id;
}

/**
 * @apiDefine GetPingStatus
 */
struct GetPingStatus {}

/**
 * @apiDefine PingStatus_SUCCESS
 * @apiSuccess {Map(String:Object(StartMinionPing))} sessions
 *             The ping sessions in progress, keyed by session ID
 */
struct PingStatus {
  1: map<string /* id */, StartMinionPing>
     (cpp.template = "std::unordered_map") sessions;
}

struct PingOutput {
  1: string output;
  2: StartMinionPing startPing;
}

############# BinaryStarApp #############

// All states in the Binary Star FSM
enum BinaryStarFsmState {
  STATE_PRIMARY = 1,          // Primary, waiting for peer to connect
  STATE_BACKUP = 2,           // Backup, waiting for peer to connect
  STATE_ACTIVE = 3,           // Active - accepting connections
  STATE_PASSIVE = 4,          // Passive - not accepting connections
}

// FSM events/inputs (1-4 correspond with the FSM states)
enum BinaryStarFsmEvent {
  PEER_PRIMARY = 1,           // Peer is pending primary
  PEER_BACKUP = 2,            // Peer is pending backup
  PEER_ACTIVE = 3,            // Peer is active
  PEER_PASSIVE = 4,           // Peer is passive
  CLIENT_REQUEST = 5,         // Client makes request
}

/**
 * @apiDefine BinaryStar_SUCCESS
 * @apiSuccess {Int(BinaryStarFsmState)=0,1,2,3,4} state
 *             The current state in the finite state machine
 *             (1=STATE_PRIMARY, 2=STATE_BACKUP,
 *              3=STATE_ACTIVE, 4=STATE_PASSIVE).
 *             If High Availability mode is not enabled, this will be 0.
 * @apiSuccess {Int64} peerExpiry The millisecond timestamp for a peer timeout
 */
// The Binary Star FSM
struct BinaryStar {
  1: BinaryStarFsmState state;
  2: i64 peerExpiry;
}

struct BinaryStarGetAppData {}

// Persistent application data to sync between controllers
struct BinaryStarAppData {
  1: optional Topology.Topology topology;
  2: optional string configNetworkOverrides;
  3: optional string configNodeOverrides;
  4: optional string configAutoNodeOverrides;
  5: optional string configController;
}

// Heartbeat struct
struct BinaryStarSync {
  1: BinaryStarFsmState state;
  2: i32 seqNum;
  3: BinaryStarAppData data;
  4: string version;
}

struct BinaryStarSwitchController {}

/**
 * @apiDefine BinaryStarGetState
 */
struct BinaryStarGetState {}

############# Common #############

struct Message {
  1: MessageType mType;
  2: binary value;
  3: optional bool compressed;
  4: optional CompressionFormat compressionFormat;
}

enum CompressionFormat {
  SNAPPY = 1,
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

// network information needed by different processes
struct NetworkInfo {
  1: string e2eCtrlUrl;
  2: string e2eCtrlUrlBackup;  // in primary-backup controller setup
  3: list<string> aggrUrl;
  4: string network;
}

// Empty message
struct Empty {}

############# Controller Config #############

struct ScanParams {
  1: ScanSchedule scanSchedule;
  2: string cbfConfigJson;
}

struct PrefixAllocParams {
  1: string seedPrefix;
  2: i32 allocPrefixLen;
}

struct ControllerConfig {
  1: map<string, string> (cpp.template = "std::unordered_map") flags;
  2: ScanParams scanParams;
  3: PrefixAllocParams prefixAllocParams;
}
