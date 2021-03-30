# Copyright (c) 2014-present, Facebook, Inc.
namespace cpp facebook.terragraph.thrift
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
  // Messages originated (by Minion StatusApp)
  STATUS_REPORT = 161,
  STATUS_REPORT_ACK = 162,
  GET_MINION_NEIGHBORS_RESP = 163,

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
  // Responses given (by Ctrl TopologyApp)
  TOPOLOGY = 321,
  NETWORK_AIRTIME = 322,
  GET_ROUTES_RESP = 323,

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
  GET_CTRL_CONFIG_STATE_REQ = 741,
  GET_CTRL_CONFIG_STATE_RESP = 742,
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
  FW_CONFIG_RESP = 594,
  FW_ROUTING_INFO = 595,

  // ===  OpenrClientApp  === //
  SYNC_LINK_MONITOR = 801,
  INJECT_KVSTORE_KEYS = 802,
  GET_ROUTING_ADJACENCIES = 810,
  ROUTING_ADJACENCIES = 811,
  SET_LINK_METRIC = 812,

  // ===  TrafficApp  === //
  // Requests handled (by ctrl TrafficApp)
  START_IPERF = 901,
  START_IPERF_RESP = 902,
  STOP_IPERF = 903,
  GET_IPERF_STATUS = 904,
  IPERF_STATUS = 905,
  // Messages originated by ctrl TrafficApp to minion
  START_IPERF_SERVER = 911,
  START_IPERF_CLIENT = 912,
  // Messages originated by minion to ctrl TrafficApp
  START_IPERF_SERVER_RESP = 921,
  IPERF_OUTPUT = 922,

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
 *           (10=PREPARE_UPGRADE, 20=COMMIT_UPGRADE, 30=RESET_STATUS)
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
 * @apiParam {Int64} limit=0 The maximum number of nodes per batch
 *           (or 0 to use a single batch)
 * @apiParam {Int64} retryLimit=3 The maximum retry attempts for each node's
 *           prepare steps
 */
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
  10: i64 retryLimit = 3; // The maximum retry attempts for each node's
                          // prepare steps
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

struct UpgradeCommitPlanReq {
  1: i64 limit;  // maximum number of nodes per batch
  2: list<string> excludeNodes;
}

struct UpgradeCommitPlan {
  1: list<list<string>> commitBatches;
  2: list<string> canaryLinks; // Each canary link is represented by a
                               // list of 2 nodes
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
  4: list<string> hardwareBoardIds;
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
  SYNC_LINK_MONITOR = 30,
  INJECT_KVSTORE_KEYS = 31,
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

struct GetCtrlConfigReq {
  1: string node;
  2: string swVersion; // To determine the config base to use
}

struct GetCtrlConfigResp {
  1: string config;
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
 * @apiDefine GetCtrlConfigNodeOverridesActionsReq
 * @apiParam {String} overrides The node config overrides (JSON), mapping node
 *           MAC addresses to their config overrides
 */
struct GetCtrlConfigNodeOverridesActionsReq {
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
 * @apiSuccess (:NodeConfigActionsResult) {Set(Int(CfgAction))=0,10,20,21,22,23,30,31} actions
 *             The actions this node will take
 *             (0=NO_ACTION, 10=REBOOT, 20=RESTART_MINION,
 *              21=RESTART_STATS_AGENT, 22=RESTART_LOGTAIL,
 *              23=RESTART_OPENR, 30=SYNC_LINK_MONITOR, 31=INJECT_KVSTORE_KEYS)
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
  1: map<string /* node mac */, NodeConfigActionsResult>
     (cpp.template = "std::unordered_map") results;
}

/**
 * @apiDefine GetCtrlConfigStateReq
 */
struct GetCtrlConfigStateReq {}

/**
 * @apiDefine NodeConfigState_SUCCESS
 * @apiSuccess (:NodeConfigState) {Boolean} isManaged
 *             Is node config managed by controller
 * @apiSuccess (:NodeConfigState) {Int64} lastStatusTime
 *             Timestamp of latest status received from node
 * @apiSuccess (:NodeConfigState) {Int64} lastConfigTime
 *             Timestamp of latest config push to node
 * @apiSuccess (:NodeConfigState) {String} ctrlMd5
 *             Node config Md5 at the controller
 * @apiSuccess (:NodeConfigState) {String} nodeMd5
 *             Node config Md5 as reported by node
 * @apiSuccess (:NodeConfigState) {String} swVersion
 *             Software version running on node
*/
struct NodeConfigState {
  1: bool isManaged;
  2: i64 lastStatusTime;
  3: i64 lastConfigTime;
  4: string ctrlMd5;
  5: string nodeMd5;
  6: string swVersion;
}

/**
 * @apiDefine GetCtrlConfigStateResp_SUCCESS
 * @apiSuccess {Map(String:Object(NodeConfigState))} configState
 *             Per-node configuration state
 */
struct GetCtrlConfigStateResp {
  1: map<string /* node mac */, NodeConfigState>
     (cpp.template = "std::unordered_map") configState;
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

struct ControllerConfig {
  1: map<string, string> (cpp.template = "std::unordered_map") flags;
}

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

// Node parameters configured on each node.
struct NodeParams {
  1: optional BWAllocation.NodeBwAlloc bwAllocMap;
  2: optional Topology.PolarityType polarity;
  3: optional Topology.GolayIdx golayIdx;
  4: optional Topology.Location location;
  5: optional BWAllocation.NodeAirtime airtimeAllocMap;
  6: optional bool enableGps;
  7: optional i8 channel;
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
  8: optional bool nodeIsPrimary; // true if node is primary, otherwise false
}

struct StatusReportAck {}

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
  2: bool markAllLinksDown;
  3: Topology.NodeStatusType nodeStatus;
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
  3: optional i8 channel;
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

/**
 * @apiDefine EditNode
 * @apiParam {String} nodeName The node name
 * @apiParam {Object(Node)} newNode The new node parameters
 */
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
  6: i8 packetIdx;   // Repeat count of this packet, 0-based
  7: i16 sweepIdx;     // Sweep index for the packet, 0-based
}

enum ScanType {
  PBF = 1,      // Periodic beamforming
  IM = 2,       // Interference measurement
  RTCAL = 3,    // Runtime calibration
  CBF_TX = 4,   // Coordinated beamforming (aka interference nulling), tx side
  CBF_RX = 5,   // Same, rx side
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

enum ScanFwStatus {
  COMPLETE = 0,
  INVALID_TYPE = 1,
  INVALID_START_TSF = 2,
  INVALID_STA = 3,
  AWV_IN_PROG = 4,
  STA_NOT_ASSOC = 5,
  REQ_BUFFER_FULL = 6,
  LINK_SHUT_DOWN = 7,
  UNKNOWN_ERROR = 8,
}

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
  10: optional RTCal rtCalType;
  11: optional i8 bwgdLen;

  // This is to control tx power
  12: optional i16 txPwrIndex; // tx power index (0 - 31)

  // For CBF scans
  14: optional i16 nullAngle;
  15: optional i16 cbfBeamIdx;
  16: optional bool isAggressor;  // victim if false
}

/**
 * @apiDefine ScanResp_SUCCESS
 * @apiSuccess (:ScanResp) {Int32} token
 *             The token used to match the request to the response
 * @apiSuccess (:ScanResp) {Int64} curSuperframeNum
 *             The superframe number, as a timestamp of the measurement
 * @apiSuccess (:ScanResp) {Object(RouteInfo)[]} routeInfoList
 *             The list of routes
 */
struct ScanResp {
   1: i32 token; // token to match request to response
   2: i64 curSuperframeNum; // time-stamp of measurement
   3: list<RouteInfo> routeInfoList; // list of routes
   4: optional i16 txPwrIndex; // tx power index used for the scan
   5: ScanFwStatus status; //0 - complete, 1 - fail
   6: optional i16 role; // Initiator or Responder
   7: optional i16 numSweeps; //Number of times beams were scanned
   8: optional i64 startSuperframeNum; // Start of BW Alloc for Scan
   9: optional i64 endSuperframeNum; // End of BW Alloc for scan
   10: optional i16 azimuthBeam; // Determined by Initial BF/PBF
   11: optional i16 oldBeam; // Used by RTCAL, VBS and CBF
   12: optional i16 newBeam; // Resultant Beam
   // Applicable for selective scan only
   13: optional i16 sweepStartBeam;
   14: optional i16 sweepEndBeam;
}

struct StartScan {
  1: ScanType scanType;
  2: ScanMode scanMode;
  3: i64 startTime; // Unixtime of the scan start
  4: optional string txNode; // If present, run scan on tx<->rx links.
                             // Otherwise, run IM scan on whole network
  5: optional list<string> rxNodes; // Should be present iff txNode is present.
                                    // Should be a singleton for PBF scan
  6: optional list<BeamIndices> beams; // Beam indices for each node
  7: optional bool apply; // 1 - Apply new beams, 0 - ignore new beams
  8: optional RTCal rtCalType;
  9: optional i8 bwgdLen;

  // This is to control tx power
  10: optional i16 txPwrIndex; // tx power index (0 - 31)

  // For CBF TX/RX
  11: optional string mainTxNode; // vtx for CBF_RX, atx for CBF_TX
  12: optional string mainRxNode; // vrx for CBF_RX, arx for CBF_TX
  // The lists should be of equal lengths
  13: optional list<string> auxTxNodes; // atx for CBF_RX, vtx for CBF_TX
  14: optional list<string> auxRxNodes; // arx for CBF_RX, vrx for CBF_TX
  15: optional list<i16> auxTxPwrIndex; // tx power index for aux nodes
  16: optional i16 nullAngle;
  17: optional i16 cbfBeamIdx;
}

/**
 * @apiDefine GetScanStatus
 * @apiParam {Boolean} isConcise If true, only metadata will be returned
 *           (without RSSI and SNR measurements)
 * @apiParam {Int32} [tokenFrom] The start of the token range; if omitted,
 *           returns the full scan results
 * @apiParam {Int32} [tokenTo] The end of the token range, inclusive (must also
 *           specify tokenFrom); if omitted, takes the value of tokenFrom
 */
struct GetScanStatus {
  1: bool isConcise;
  2: optional i32 tokenFrom;
  3: optional i32 tokenTo;
}

/**
 * @apiDefine ResetScanStatus
 * @apiParam {Int32} [tokenFrom] The start of the token range (must also specify
 *           tokenTo); if omitted, clears all scans
 * @apiParam {Int32} [tokenTo] The end of the token range, inclusive (must also
 *           specify tokenFrom); if omitted, clears all scans
 */
struct ResetScanStatus {
  1: optional i32 tokenFrom;
  2: optional i32 tokenTo;
}

/**
 * @apiDefine ScanData_SUCCESS
 * @apiSuccess (:ScanData) {Map(String:Object(ScanResp))} responses
 *             The scan responses (node:response)
 * @apiSuccess (:ScanData) {String} txNode The transmitter node
 * @apiSuccess (:ScanData) {Int64} startBwgdIdx
 *             The starting bandwidth grant duration (BWGD) index
 */
// Data collected from a single scan.
// Filled in incrementally, as responses arrive.
struct ScanData {
  1: map<string /* nodename */, ScanResp>
     (cpp.template = "std::unordered_map") responses;
  2: string txNode;
  3: i64 startBwgdIdx;
  4: ScanType type;
  5: RTCal subType;
  6: ScanMode mode;
  7: optional bool apply;
}

/**
 * @apiDefine ScanStatus_SUCCESS
 * @apiSuccess {Map(Int32:Object(ScanData))} scans The scan data (token:data)
 */
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

struct GetRoutingAdjacencies {}

struct RoutingAdjacencies {
  1: map<string /* node id */, Lsdb.AdjacencyDatabase>
     (cpp.template = "std::unordered_map") adjacencyMap;
  2: map<string /* node id */, Lsdb.PrefixDatabase>
     (cpp.template = "std::unordered_map") prefixMap;
}

struct SetLinkMetric {
  1: string macAddr;
  2: i32 metric;
}

############# TrafficApp ##############

// Protocol numbers:
// https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
enum IperfTransportProtocol {
  TCP = 6,
  UDP = 17,
}

/**
 * @apiDefine IperfOptions_GROUP
 * @apiParam (:IperfOptions) {Int64} [bitrate]
 *                           The target traffic bitrate (bps)
 * @apiParam (:IperfOptions) {Int32} [timeSec]
 *                           The measurement duration (in seconds)
 * @apiParam (:IperfOptions) {Int(IperfTransportProtocol)=6,17} [protocol]
 *                           The transport protocol (6=TCP, 17=UDP)
 * @apiParam (:IperfOptions) {Int32} [intervalSec]
 *                           The interval between periodic bandwidth reports
 *                           (in seconds)
 * @apiParam (:IperfOptions) {Int64} [windowSize] The window size (in bytes)
 * @apiParam (:IperfOptions) {Int32} [mss]
 *                           The TCP maximum segment size (MTU - 40 bytes)
 * @apiParam (:IperfOptions) {Boolean} [noDelay] Disable Nagle's Algorithm
 * @apiParam (:IperfOptions) {Int32} [omitSec]
 *                           Omit the first n seconds of the measurement
 * @apiParam (:IperfOptions) {Boolean} [verbose] Show more detailed output
 */
/**
 * @apiDefine IperfOptions_SUCCESS
 * @apiSuccess (:IperfOptions) {Int64} [bitrate]
 *                             The target traffic bitrate (bps)
 * @apiSuccess (:IperfOptions) {Int32} [timeSec]
 *                             The measurement duration (in seconds)
 * @apiSuccess (:IperfOptions) {Int(IperfTransportProtocol)=6,17} [protocol]
 *                             The transport protocol (6=TCP, 17=UDP)
 * @apiSuccess (:IperfOptions) {Int32} [intervalSec]
 *                             The interval between periodic bandwidth reports
 *                             (in seconds)
 * @apiSuccess (:IperfOptions) {Int64} [windowSize] The window size (in bytes)
 * @apiSuccess (:IperfOptions) {Int32} [mss]
 *                             The TCP maximum segment size (MTU - 40 bytes)
 * @apiSuccess (:IperfOptions) {Boolean} [noDelay] Disable Nagle's Algorithm
 * @apiSuccess (:IperfOptions) {Int32} [omitSec]
 *                             Omit the first n seconds of the measurement
 * @apiSuccess (:IperfOptions) {Boolean} [verbose] Show more detailed output
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
}

/**
 * @apiDefine StartIperf
 * @apiParam {String} srcNodeId The source node MAC address
 * @apiParam {String} dstNodeId The destination node MAC address
 * @apiParam {String} [dstNodeIpv6] The destination node IPv6 address
 * @apiParam {Object(IperfOptions)} [options] The iperf options
 */
/**
 * @apiDefine StartIperf_SUCCESS
 * @apiSuccess (:StartIperf) {String} srcNodeId The source node MAC address
 * @apiSuccess (:StartIperf) {String} dstNodeId The destination node MAC address
 * @apiSuccess (:StartIperf) {String} [dstNodeIpv6] The destination node IPv6 address
 * @apiSuccess (:StartIperf) {Object(IperfOptions)} [options] The iperf options
 */
struct StartIperf {
  1: string srcNodeId;
  2: string dstNodeId;
  3: optional string dstNodeIpv6;
  4: optional IperfOptions options;
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
 * @apiSuccess (:StartMinionIperf) {Object(StartIperf)} iperfConfig The iperf config
 * @apiSuccess (:StartMinionIperf) {Int32} serverPort The server port
 * @apiSuccess (:StartMinionIperf) {String} id The iperf session ID
 */
struct StartMinionIperf {
  1: StartIperf iperfConfig;
  2: i32 serverPort = 0;
  3: string id;
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
 * @apiSuccess {Int(BinaryStarFsmState)=1,2,3,4} state
 *             The current state in the finite state machine
 *             (1=STATE_PRIMARY, 2=STATE_BACKUP,
 *              3=STATE_ACTIVE, 4=STATE_PASSIVE)
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
}

// Heartbeat struct
struct BinaryStarSync {
  1: BinaryStarFsmState state;
  2: i32 seqNum;
  3: BinaryStarAppData data;
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

// network information needed by different processes
struct NetworkInfo {
  1: string e2eCtrlUrl;
  2: string e2eCtrlUrlBackup;  // in primary-backup controller setup
  3: list<string> aggrCtrlUrl;
  4: string network;
  5: BgpNeighbors bgpNeighbors; // TODO: deprecate
  6: BgpConfig bgpConfig;
  7: string dhcpNameServer;
  8: i64 dhcpRangeMin;
  9: i64 dhcpRangeMax;
  10: string dhcpGlobalConfigAppend;
}

// Empty message
struct Empty {}
