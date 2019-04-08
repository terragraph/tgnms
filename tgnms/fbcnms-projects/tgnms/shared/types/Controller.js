// @flow

// Generated by thrift2flow at Thu Feb 21 2019 13:01:24 GMT-0800 (PST)
/* eslint-disable */

import * as Lsdb from "./Lsdb";
import * as BWAllocation from "./BWAllocation";
import * as Topology from "./Topology";

export type MessageTypeType =
  | "GET_STATUS_DUMP"
  | "REBOOT_REQUEST"
  | "GET_CTRL_NEIGHBORS_REQ"
  | "STATUS_DUMP"
  | "GET_CTRL_NEIGHBORS_RESP"
  | "GET_NEIGHBORS_RESP"
  | "SET_NODE_PARAMS"
  | "REBOOT_NODE"
  | "GET_MINION_NEIGHBORS_REQ"
  | "STATUS_REPORT"
  | "STATUS_REPORT_ACK"
  | "GET_MINION_NEIGHBORS_RESP"
  | "GET_IGNITION_STATE"
  | "SET_IGNITION_PARAMS"
  | "SET_LINK_STATUS_REQ"
  | "IGNITION_STATE"
  | "SET_LINK_STATUS"
  | "GET_LINK_STATUS"
  | "LINK_STATUS"
  | "GET_TOPOLOGY"
  | "GET_NETWORK_AIRTIME"
  | "SET_NODE_STATUS"
  | "SET_NODE_MAC"
  | "SET_NODE_MAC_LIST"
  | "SET_NODE_PARAMS_REQ"
  | "BUMP_LINKUP_ATTEMPTS"
  | "ADD_NODE"
  | "ADD_LINK"
  | "DEL_NODE"
  | "DEL_LINK"
  | "ADD_SITE"
  | "DEL_SITE"
  | "EDIT_SITE"
  | "EDIT_NODE"
  | "SET_NETWORK_PARAMS_REQ"
  | "RESET_TOPOLOGY_STATE"
  | "SET_TOPOLOGY_NAME"
  | "BULK_ADD"
  | "GET_ROUTES"
  | "TOPOLOGY"
  | "NETWORK_AIRTIME"
  | "GET_ROUTES_RESP"
  | "UPGRADE_REQ"
  | "SET_UPGRADE_STATUS"
  | "UPGRADE_GROUP_REQ"
  | "UPGRADE_STATE_REQ"
  | "UPGRADE_ABORT_REQ"
  | "UPGRADE_COMMIT_PLAN_REQ"
  | "UPGRADE_ADD_IMAGE_REQ"
  | "UPGRADE_DEL_IMAGE_REQ"
  | "UPGRADE_LIST_IMAGES_REQ"
  | "UPGRADE_STATE_DUMP"
  | "UPGRADE_COMMIT_PLAN"
  | "UPGRADE_LIST_IMAGES_RESP"
  | "GET_MINION_CONFIG_REQ"
  | "GET_MINION_CONFIG_RESP"
  | "SET_MINION_CONFIG_REQ"
  | "GET_MINION_CONFIG_ACTIONS_REQ"
  | "GET_MINION_CONFIG_ACTIONS_RESP"
  | "GET_CTRL_CONFIG_REQ"
  | "GET_CTRL_CONFIG_RESP"
  | "GET_CTRL_CONFIG_NODE_OVERRIDES_REQ"
  | "GET_CTRL_CONFIG_NODE_OVERRIDES_RESP"
  | "GET_CTRL_CONFIG_BASE_REQ"
  | "GET_CTRL_CONFIG_BASE_RESP"
  | "GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ"
  | "GET_CTRL_CONFIG_NETWORK_OVERRIDES_RESP"
  | "SET_CTRL_CONFIG_NODE_OVERRIDES_REQ"
  | "SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ"
  | "GET_CTRL_CONFIG_STATE_REQ"
  | "GET_CTRL_CONFIG_STATE_RESP"
  | "GET_CTRL_CONFIG_METADATA_REQ"
  | "GET_CTRL_CONFIG_METADATA_RESP"
  | "GET_CTRL_CONFIG_NETWORK_OVERRIDES_ACTIONS_REQ"
  | "GET_CTRL_CONFIG_NODE_OVERRIDES_ACTIONS_REQ"
  | "GET_CTRL_CONFIG_OVERRIDES_ACTIONS_RESP"
  | "GET_CTRL_CONFIG_ACTIONS_RESULTS_REQ"
  | "GET_CTRL_CONFIG_ACTIONS_RESULTS_RESP"
  | "GET_CTRL_CONFIG_CONTROLLER_REQ"
  | "GET_CTRL_CONFIG_CONTROLLER_RESP"
  | "SET_CTRL_CONFIG_CONTROLLER_REQ"
  | "GET_CTRL_CONFIG_CONTROLLER_METADATA_REQ"
  | "GET_CTRL_CONFIG_CONTROLLER_METADATA_RESP"
  | "SCAN_REQ"
  | "SCAN_RESP"
  | "START_SCAN"
  | "GET_SCAN_STATUS"
  | "RESET_SCAN_STATUS"
  | "GET_SCAN_SCHEDULE"
  | "SET_SCAN_SCHEDULE"
  | "SCAN_STATUS"
  | "SCAN_SCHEDULE"
  | "GET_SLOT_MAP_CONFIG"
  | "SET_SLOT_MAP_CONFIG"
  | "SLOT_MAP_CONFIG"
  | "DR_ACK"
  | "GPS_GET_POS_RESP"
  | "DR_DEV_ALLOC_RES"
  | "GPS_GET_POS_REQ"
  | "DR_DEV_ALLOC_REQ"
  | "NODE_INIT"
  | "DR_SET_LINK_STATUS"
  | "FW_SET_NODE_PARAMS"
  | "FW_STATS_CONFIGURE_REQ"
  | "PHY_LA_CONFIG_REQ"
  | "GPS_ENABLE_REQ"
  | "FW_SET_CODEBOOK"
  | "FW_DEBUG_REQ"
  | "PHY_AGC_CONFIG_REQ"
  | "PHY_GOLAY_SEQUENCE_CONFIG_REQ"
  | "FW_CONFIG_REQ"
  | "PHY_TPC_CONFIG_REQ"
  | "FW_BF_RESP_SCAN"
  | "NODE_INIT_NOTIFY"
  | "DR_LINK_STATUS"
  | "FW_STATS"
  | "FW_ACK"
  | "FW_HEALTHY"
  | "FW_GET_CODEBOOK"
  | "FW_CONFIG_RESP"
  | "FW_ROUTING_INFO"
  | "SYNC_LINK_MONITOR"
  | "INJECT_KVSTORE_KEYS"
  | "GET_ROUTING_ADJACENCIES"
  | "ROUTING_ADJACENCIES"
  | "SET_LINK_METRIC"
  | "START_IPERF"
  | "START_IPERF_RESP"
  | "STOP_IPERF"
  | "GET_IPERF_STATUS"
  | "IPERF_STATUS"
  | "START_IPERF_SERVER"
  | "START_IPERF_CLIENT"
  | "START_IPERF_SERVER_RESP"
  | "IPERF_OUTPUT"
  | "BSTAR_SYNC"
  | "BSTAR_FSM"
  | "BSTAR_GET_APP_DATA"
  | "BSTAR_APP_DATA"
  | "BSTAR_GET_STATE"
  | "BSTAR_SWITCH_CONTROLLER"
  | "NONE"
  | "HELLO"
  | "E2E_ACK"
  | "TEST"
  | "DR_RESP"
  | "DR_STAT_PUSH";
export const MessageTypeValueMap = {
  GET_STATUS_DUMP: 101,
  REBOOT_REQUEST: 102,
  GET_CTRL_NEIGHBORS_REQ: 103,
  STATUS_DUMP: 121,
  GET_CTRL_NEIGHBORS_RESP: 122,
  GET_NEIGHBORS_RESP: 123,
  SET_NODE_PARAMS: 141,
  REBOOT_NODE: 142,
  GET_MINION_NEIGHBORS_REQ: 143,
  STATUS_REPORT: 161,
  STATUS_REPORT_ACK: 162,
  GET_MINION_NEIGHBORS_RESP: 163,
  GET_IGNITION_STATE: 201,
  SET_IGNITION_PARAMS: 202,
  SET_LINK_STATUS_REQ: 203,
  IGNITION_STATE: 221,
  SET_LINK_STATUS: 241,
  GET_LINK_STATUS: 242,
  LINK_STATUS: 261,
  GET_TOPOLOGY: 301,
  GET_NETWORK_AIRTIME: 319,
  SET_NODE_STATUS: 302,
  SET_NODE_MAC: 303,
  SET_NODE_MAC_LIST: 315,
  SET_NODE_PARAMS_REQ: 304,
  BUMP_LINKUP_ATTEMPTS: 305,
  ADD_NODE: 306,
  ADD_LINK: 307,
  DEL_NODE: 308,
  DEL_LINK: 309,
  ADD_SITE: 310,
  DEL_SITE: 311,
  EDIT_SITE: 317,
  EDIT_NODE: 318,
  SET_NETWORK_PARAMS_REQ: 312,
  RESET_TOPOLOGY_STATE: 313,
  SET_TOPOLOGY_NAME: 314,
  BULK_ADD: 316,
  GET_ROUTES: 320,
  TOPOLOGY: 321,
  NETWORK_AIRTIME: 322,
  GET_ROUTES_RESP: 323,
  UPGRADE_REQ: 401,
  SET_UPGRADE_STATUS: 421,
  UPGRADE_GROUP_REQ: 441,
  UPGRADE_STATE_REQ: 442,
  UPGRADE_ABORT_REQ: 443,
  UPGRADE_COMMIT_PLAN_REQ: 444,
  UPGRADE_ADD_IMAGE_REQ: 445,
  UPGRADE_DEL_IMAGE_REQ: 446,
  UPGRADE_LIST_IMAGES_REQ: 447,
  UPGRADE_STATE_DUMP: 451,
  UPGRADE_COMMIT_PLAN: 452,
  UPGRADE_LIST_IMAGES_RESP: 453,
  GET_MINION_CONFIG_REQ: 721,
  GET_MINION_CONFIG_RESP: 722,
  SET_MINION_CONFIG_REQ: 723,
  GET_MINION_CONFIG_ACTIONS_REQ: 725,
  GET_MINION_CONFIG_ACTIONS_RESP: 726,
  GET_CTRL_CONFIG_REQ: 731,
  GET_CTRL_CONFIG_RESP: 732,
  GET_CTRL_CONFIG_NODE_OVERRIDES_REQ: 733,
  GET_CTRL_CONFIG_NODE_OVERRIDES_RESP: 734,
  GET_CTRL_CONFIG_BASE_REQ: 735,
  GET_CTRL_CONFIG_BASE_RESP: 736,
  GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ: 737,
  GET_CTRL_CONFIG_NETWORK_OVERRIDES_RESP: 738,
  SET_CTRL_CONFIG_NODE_OVERRIDES_REQ: 739,
  SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ: 740,
  GET_CTRL_CONFIG_STATE_REQ: 741,
  GET_CTRL_CONFIG_STATE_RESP: 742,
  GET_CTRL_CONFIG_METADATA_REQ: 743,
  GET_CTRL_CONFIG_METADATA_RESP: 744,
  GET_CTRL_CONFIG_NETWORK_OVERRIDES_ACTIONS_REQ: 745,
  GET_CTRL_CONFIG_NODE_OVERRIDES_ACTIONS_REQ: 746,
  GET_CTRL_CONFIG_OVERRIDES_ACTIONS_RESP: 747,
  GET_CTRL_CONFIG_ACTIONS_RESULTS_REQ: 748,
  GET_CTRL_CONFIG_ACTIONS_RESULTS_RESP: 749,
  GET_CTRL_CONFIG_CONTROLLER_REQ: 750,
  GET_CTRL_CONFIG_CONTROLLER_RESP: 751,
  SET_CTRL_CONFIG_CONTROLLER_REQ: 752,
  GET_CTRL_CONFIG_CONTROLLER_METADATA_REQ: 753,
  GET_CTRL_CONFIG_CONTROLLER_METADATA_RESP: 754,
  SCAN_REQ: 601,
  SCAN_RESP: 621,
  START_SCAN: 641,
  GET_SCAN_STATUS: 642,
  RESET_SCAN_STATUS: 643,
  GET_SCAN_SCHEDULE: 644,
  SET_SCAN_SCHEDULE: 645,
  SCAN_STATUS: 661,
  SCAN_SCHEDULE: 662,
  GET_SLOT_MAP_CONFIG: 701,
  SET_SLOT_MAP_CONFIG: 702,
  SLOT_MAP_CONFIG: 703,
  DR_ACK: 491,
  GPS_GET_POS_RESP: 492,
  DR_DEV_ALLOC_RES: 493,
  GPS_GET_POS_REQ: 495,
  DR_DEV_ALLOC_REQ: 496,
  NODE_INIT: 501,
  DR_SET_LINK_STATUS: 502,
  FW_SET_NODE_PARAMS: 503,
  FW_STATS_CONFIGURE_REQ: 504,
  PHY_LA_CONFIG_REQ: 505,
  GPS_ENABLE_REQ: 506,
  FW_SET_CODEBOOK: 507,
  FW_DEBUG_REQ: 508,
  PHY_AGC_CONFIG_REQ: 509,
  PHY_GOLAY_SEQUENCE_CONFIG_REQ: 510,
  FW_CONFIG_REQ: 511,
  PHY_TPC_CONFIG_REQ: 512,
  FW_BF_RESP_SCAN: 513,
  NODE_INIT_NOTIFY: 551,
  DR_LINK_STATUS: 552,
  FW_STATS: 553,
  FW_ACK: 591,
  FW_HEALTHY: 592,
  FW_GET_CODEBOOK: 593,
  FW_CONFIG_RESP: 594,
  FW_ROUTING_INFO: 595,
  SYNC_LINK_MONITOR: 801,
  INJECT_KVSTORE_KEYS: 802,
  GET_ROUTING_ADJACENCIES: 810,
  ROUTING_ADJACENCIES: 811,
  SET_LINK_METRIC: 812,
  START_IPERF: 901,
  START_IPERF_RESP: 902,
  STOP_IPERF: 903,
  GET_IPERF_STATUS: 904,
  IPERF_STATUS: 905,
  START_IPERF_SERVER: 911,
  START_IPERF_CLIENT: 912,
  START_IPERF_SERVER_RESP: 921,
  IPERF_OUTPUT: 922,
  BSTAR_SYNC: 1101,
  BSTAR_FSM: 1102,
  BSTAR_GET_APP_DATA: 1103,
  BSTAR_APP_DATA: 1104,
  BSTAR_GET_STATE: 1105,
  BSTAR_SWITCH_CONTROLLER: 1110,
  NONE: 1001,
  HELLO: 1002,
  E2E_ACK: 1003,
  TEST: 1004,
  DR_RESP: 1005,
  DR_STAT_PUSH: 1006
};

export type LinkActionTypeType =
  | "LINK_UP"
  | "LINK_DOWN"
  | "LINK_ADD"
  | "LINK_DELETE";
export const LinkActionTypeValueMap = {
  LINK_UP: 1,
  LINK_DOWN: 2,
  LINK_ADD: 3,
  LINK_DELETE: 4
};

export type LinkStatusTypeType = "LINK_UP" | "LINK_DOWN";
export const LinkStatusTypeValueMap = {
  LINK_UP: 1,
  LINK_DOWN: 2
};

export type UpgradeStatusTypeType =
  | "NONE"
  | "DOWNLOADING_IMAGE"
  | "DOWNLOAD_FAILED"
  | "FLASHING_IMAGE"
  | "FLASH_FAILED"
  | "FLASHED"
  | "COMMIT_FAILED";
export const UpgradeStatusTypeValueMap = {
  NONE: 10,
  DOWNLOADING_IMAGE: 20,
  DOWNLOAD_FAILED: 30,
  FLASHING_IMAGE: 40,
  FLASH_FAILED: 50,
  FLASHED: 60,
  COMMIT_FAILED: 70
};

export type ImageMetaType = {| md5: string, version: string |};

export type UpgradeStatusType = {|
  usType: UpgradeStatusTypeType,
  nextImage: ImageMetaType,
  reason: string,
  upgradeReqId: string,
  whenToCommit: Buffer
|};

export type UpgradeReqTypeType =
  | "PREPARE_UPGRADE"
  | "COMMIT_UPGRADE"
  | "RESET_STATUS";
export const UpgradeReqTypeValueMap = {
  PREPARE_UPGRADE: 10,
  COMMIT_UPGRADE: 20,
  RESET_STATUS: 30
};

export type UpgradeTorrentParamsType = {|
  downloadTimeout: Buffer,
  downloadLimit?: Buffer,
  uploadLimit?: Buffer,
  maxConnections?: Buffer
|};

export type UpgradeReqType = {|
  urType: UpgradeReqTypeType,
  upgradeReqId: string,
  md5: string,
  imageUrl: string,
  scheduleToCommit?: Buffer,
  downloadAttempts?: Buffer,
  torrentParams?: UpgradeTorrentParamsType
|};

export type UpgradeGroupTypeType = "NODES" | "NETWORK";
export const UpgradeGroupTypeValueMap = {
  NODES: 10,
  NETWORK: 20
};

export type UpgradeGroupReqType = {|
  ugType: UpgradeGroupTypeType,
  nodes: string[],
  excludeNodes: string[],
  urReq: UpgradeReqType,
  timeout: Buffer,
  skipFailure: boolean,
  version: string,
  skipLinks: string[],
  limit: Buffer,
  retryLimit: Buffer
|};

export type UpgradeStateReqType = {||};

export type UpgradeStateDumpType = {|
  curBatch: string[],
  pendingBatches: string[][],
  curReq: UpgradeGroupReqType,
  pendingReqs: UpgradeGroupReqType[]
|};

export type UpgradeAbortReqType = {| abortAll: boolean, reqIds: string[] |};

export type UpgradeCommitPlanReqType = {|
  limit: Buffer,
  excludeNodes: string[]
|};

export type UpgradeCommitPlanType = {|
  commitBatches: string[][],
  canaryLinks: string[]
|};

export type UpgradeImageType = {|
  name: string,
  magnetUri: string,
  md5: string
|};

export type UpgradeAddImageReqType = {| imageUrl: string |};

export type UpgradeDelImageReqType = {| name: string |};

export type UpgradeListImagesReqType = {||};

export type UpgradeListImagesRespType = {| images: UpgradeImageType[] |};

export type CfgActionType =
  | "NO_ACTION"
  | "REBOOT"
  | "RESTART_MINION"
  | "RESTART_STATS_AGENT"
  | "RESTART_LOGTAIL"
  | "RESTART_OPENR"
  | "SYNC_LINK_MONITOR"
  | "INJECT_KVSTORE_KEYS";
export const CfgActionValueMap = {
  NO_ACTION: 0,
  REBOOT: 10,
  RESTART_MINION: 20,
  RESTART_STATS_AGENT: 21,
  RESTART_LOGTAIL: 22,
  RESTART_OPENR: 23,
  SYNC_LINK_MONITOR: 30,
  INJECT_KVSTORE_KEYS: 31
};

export type CfgParamTypeType =
  | "INTEGER"
  | "STRING"
  | "BOOLEAN"
  | "OBJECT"
  | "MAP"
  | "FLOAT";
export const CfgParamTypeValueMap = {
  INTEGER: 10,
  STRING: 20,
  BOOLEAN: 30,
  OBJECT: 40,
  MAP: 50,
  FLOAT: 60
};

export type GetMinionConfigReqType = {||};

export type GetMinionConfigRespType = {| config: string |};

export type SetMinionConfigReqType = {| config: string |};

export type GetMinionConfigActionsReqType = {| config: string, id: string |};

export type GetMinionConfigActionsRespType = {|
  actions: CfgActionType[],
  id: string
|};

export type GetCtrlConfigReqType = {| node: string, swVersion: string |};

export type GetCtrlConfigRespType = {| config: string |};

export type GetCtrlConfigNodeOverridesReqType = {| nodes: string[] |};

export type GetCtrlConfigNodeOverridesRespType = {| overrides: string |};

export type SetCtrlConfigNodeOverridesReqType = {| overrides: string |};

export type GetCtrlConfigNodeOverridesActionsReqType = {| overrides: string |};

export type GetCtrlConfigBaseReqType = {| swVersions: string[] |};

export type GetCtrlConfigBaseRespType = {| config: string |};

export type GetCtrlConfigNetworkOverridesReqType = {||};

export type GetCtrlConfigNetworkOverridesRespType = {| overrides: string |};

export type SetCtrlConfigNetworkOverridesReqType = {| overrides: string |};

export type GetCtrlConfigNetworkOverridesActionsReqType = {|
  overrides: string
|};

export type GetCtrlConfigOverridesActionsRespType = {|
  overrides: string,
  id: string,
  availableUntil: Buffer
|};

export type GetCtrlConfigActionsResultsReqType = {| id: string |};

export type NodeConfigActionsResultType = {| actions: CfgActionType[] |};

export type GetCtrlConfigActionsResultsRespType = {|
  results: { [string]: NodeConfigActionsResultType }
|};

export type GetCtrlConfigStateReqType = {||};

export type NodeConfigStateType = {|
  isManaged: boolean,
  lastStatusTime: Buffer,
  lastConfigTime: Buffer,
  ctrlMd5: string,
  nodeMd5: string,
  swVersion: string
|};

export type GetCtrlConfigStateRespType = {|
  configState: { [string]: NodeConfigStateType }
|};

export type GetCtrlConfigMetadataType = {||};

export type GetCtrlConfigMetadataRespType = {| metadata: string |};

export type MinionConfigChangedType = {||};

export type ControllerConfigType = {| flags: { [string]: string } |};

export type GetCtrlControllerConfigReqType = {||};

export type GetCtrlControllerConfigRespType = {| config: string |};

export type SetCtrlControllerConfigReqType = {| config: string |};

export type GetCtrlControllerConfigMetadataType = {||};

export type GetCtrlControllerConfigMetadataRespType = {| metadata: string |};

export type RebootReqType = {|
  nodes: string[],
  force: boolean,
  secondsToReboot: number
|};

export type RebootNodeType = {| force: boolean, secondsToReboot?: number |};

export type NodeParamsType = {|
  bwAllocMap?: BWAllocation.NodeBwAllocType,
  polarity?: Topology.PolarityTypeType,
  golayIdx?: Topology.GolayIdxType,
  location?: Topology.LocationType,
  airtimeAllocMap?: BWAllocation.NodeAirtimeType,
  enableGps?: boolean,
  channel?: number
|};

export type StatusReportType = {|
  timeStamp: Buffer,
  ipv6Address: string,
  version: string,
  ubootVersion: string,
  status: Topology.NodeStatusTypeType,
  upgradeStatus: UpgradeStatusType,
  configMd5: string,
  nodeIsPrimary?: boolean
|};

export type StatusReportAckType = {||};

export type GetStatusDumpType = {||};

export type StatusDumpType = {|
  timeStamp: Buffer,
  statusReports: { [string]: StatusReportType },
  version?: string
|};

export type GetCtrlNeighborsReqType = {| devices: string[] |};

export type GetCtrlNeighborsRespType = {| devices: string[], reqId: string |};

export type GetNeighborsRespType = {|
  deviceNeighborsMap: { [string]: MinionNeighborType[] },
  reqId: string,
  minion: string
|};

export type MinionNeighborStateType =
  | "PERMANENT"
  | "NOARP"
  | "REACHABLE"
  | "STALE"
  | "NONE"
  | "INCOMPLETE"
  | "DELAY"
  | "PROBE"
  | "FAILED"
  | "UNKNOWN";
export const MinionNeighborStateValueMap = {
  PERMANENT: 0,
  NOARP: 1,
  REACHABLE: 2,
  STALE: 3,
  NONE: 4,
  INCOMPLETE: 5,
  DELAY: 6,
  PROBE: 7,
  FAILED: 8,
  UNKNOWN: 9
};

export type MinionNeighborType = {|
  ipv6Address: string,
  macAddr: string,
  state: MinionNeighborStateType
|};

export type GetMinionNeighborsReqType = {|
  devices: string[],
  reqId: string,
  senderApp: string
|};

export type GetMinionNeighborsRespType = {|
  deviceNeighborsMap: { [string]: MinionNeighborType[] },
  reqId: string,
  senderApp: string
|};

export type GetIgnitionStateType = {||};

export type IgnitionParamsType = {|
  enable?: boolean,
  linkUpInterval?: Buffer,
  linkUpDampenInterval?: Buffer,
  linkAutoIgnite?: { [string]: boolean }
|};

export type SetLinkStatusReqType = {|
  action: LinkActionTypeType,
  initiatorNodeName: string,
  responderNodeName: string
|};

export type IgnitionCandidateType = {|
  initiatorNodeName: string,
  linkName: string
|};

export type IgnitionStateType = {|
  visitedNodeNames: string[],
  igCandidates: IgnitionCandidateType[],
  lastIgCandidates: IgnitionCandidateType[],
  igParams: IgnitionParamsType
|};

export type SetLinkStatusType = {|
  linkStatusType: LinkStatusTypeType,
  responderMac: string,
  responderNodeType?: Topology.NodeTypeType,
  golayIdx?: Topology.GolayIdxType,
  controlSuperframe?: Buffer,
  responderNodePolarity?: Topology.PolarityTypeType
|};

export type GetLinkStatusType = {| responderMac: string |};

export type LinkStatusType = {|
  responderMac: string,
  linkStatusType: LinkStatusTypeType
|};

export type GetTopologyType = {||};

export type GetNetworkAirtimeType = {||};

export type SetNodeStatusType = {|
  nodeMac: string,
  markAllLinksDown: boolean,
  nodeStatus: Topology.NodeStatusTypeType
|};

export type SetNodeParamsReqType = {|
  nodeMac: string,
  nodeAirtime?: BWAllocation.NodeAirtimeType,
  nodeBWAlloc?: BWAllocation.NodeBwAllocType,
  nodeIsPrimary?: boolean
|};

export type SetNetworkParamsReqType = {|
  networkAirtime?: BWAllocation.NetworkAirtimeType,
  networkBWAlloc?: BWAllocation.NetworkBwAllocType,
  channel?: number
|};

export type SetNodeMacType = {|
  nodeName: string,
  nodeMac: string,
  force: boolean
|};

export type SetNodeMacListType = {| setNodeMacList: SetNodeMacType[] |};

export type SetTopologyNameType = {| name: string |};

export type BumpLinkUpAttemptsType = {| linkName: string |};

export type AddNodeType = {| node: Topology.NodeType |};

export type DelNodeType = {| nodeName: string, force: boolean |};

export type EditNodeType = {| nodeName: string, newNode: Topology.NodeType |};

export type AddLinkType = {| link: Topology.LinkType |};

export type DelLinkType = {|
  aNodeName: string,
  zNodeName: string,
  force: boolean
|};

export type AddSiteType = {| site: Topology.SiteType |};

export type DelSiteType = {| siteName: string |};

export type EditSiteType = {| siteName: string, newSite: Topology.SiteType |};

export type ResetTopologyStateType = {| resetLinkupAttempts: boolean |};

export type BulkAddType = {|
  sites: Topology.SiteType[],
  nodes: Topology.NodeType[],
  links: Topology.LinkType[]
|};

export type GetRoutesType = {| srcNode: string, dstNode: string |};

export type GetRoutesRespType = {| routes: string[][] |};

export type MicroRouteType = {| tx: number, rx: number |};

export type RouteInfoType = {|
  route: MicroRouteType,
  rssi: number,
  snrEst: number,
  postSnr: number,
  rxStart: number,
  packetIdx: number,
  sweepIdx: number
|};

export type ScanTypeType = "PBF" | "IM" | "RTCAL" | "CBF_TX" | "CBF_RX";
export const ScanTypeValueMap = {
  PBF: 1,
  IM: 2,
  RTCAL: 3,
  CBF_TX: 4,
  CBF_RX: 5
};

export type ScanModeType = "COARSE" | "FINE" | "SELECTIVE";
export const ScanModeValueMap = {
  COARSE: 1,
  FINE: 2,
  SELECTIVE: 3
};

export type RTCalType =
  | "NO_CAL"
  | "TOP_RX_CAL"
  | "TOP_TX_CAL"
  | "BOT_RX_CAL"
  | "BOT_TX_CAL"
  | "VBS_RX_CAL"
  | "VBS_TX_CAL";
export const RTCalValueMap = {
  NO_CAL: 0,
  TOP_RX_CAL: 1,
  TOP_TX_CAL: 2,
  BOT_RX_CAL: 3,
  BOT_TX_CAL: 4,
  VBS_RX_CAL: 5,
  VBS_TX_CAL: 6
};

export type ScanFwStatusType =
  | "COMPLETE"
  | "INVALID_TYPE"
  | "INVALID_START_TSF"
  | "INVALID_STA"
  | "AWV_IN_PROG"
  | "STA_NOT_ASSOC"
  | "REQ_BUFFER_FULL"
  | "LINK_SHUT_DOWN"
  | "UNKNOWN_ERROR";
export const ScanFwStatusValueMap = {
  COMPLETE: 0,
  INVALID_TYPE: 1,
  INVALID_START_TSF: 2,
  INVALID_STA: 3,
  AWV_IN_PROG: 4,
  STA_NOT_ASSOC: 5,
  REQ_BUFFER_FULL: 6,
  LINK_SHUT_DOWN: 7,
  UNKNOWN_ERROR: 8
};

export type BeamIndicesType = {| low: number, high: number |};

export type ScanReqType = {|
  token: number,
  scanType?: ScanTypeType,
  scanMode: ScanModeType,
  startBwgdIdx: Buffer,
  bfScanInvertPolarity: boolean,
  txNodeMac?: string,
  rxNodeMac?: string,
  routes?: MicroRouteType[],
  beams?: BeamIndicesType,
  apply?: boolean,
  rtCalType?: RTCalType,
  bwgdLen?: number,
  txPwrIndex?: number,
  nullAngle?: number,
  cbfBeamIdx?: number,
  isAggressor?: boolean
|};

export type ScanRespType = {|
  token: number,
  curSuperframeNum: Buffer,
  routeInfoList: RouteInfoType[],
  txPwrIndex?: number,
  status: ScanFwStatusType,
  role?: number,
  numSweeps?: number,
  startSuperframeNum?: Buffer,
  endSuperframeNum?: Buffer,
  azimuthBeam?: number,
  oldBeam?: number,
  newBeam?: number,
  sweepStartBeam?: number,
  sweepEndBeam?: number
|};

export type StartScanType = {|
  scanType: ScanTypeType,
  scanMode: ScanModeType,
  startTime: Buffer,
  txNode?: string,
  rxNodes?: string[],
  beams?: BeamIndicesType[],
  apply?: boolean,
  rtCalType?: RTCalType,
  bwgdLen?: number,
  txPwrIndex?: number,
  mainTxNode?: string,
  mainRxNode?: string,
  auxTxNodes?: string[],
  auxRxNodes?: string[],
  auxTxPwrIndex?: number[],
  nullAngle?: number,
  cbfBeamIdx?: number
|};

export type GetScanStatusType = {|
  isConcise: boolean,
  tokenFrom?: number,
  tokenTo?: number
|};

export type ResetScanStatusType = {| tokenFrom?: number, tokenTo?: number |};

export type ScanDataType = {|
  responses: { [string]: ScanRespType },
  txNode: string,
  startBwgdIdx: Buffer,
  type: ScanTypeType,
  subType: RTCalType,
  mode: ScanModeType,
  apply?: boolean
|};

export type ScanStatusType = {| scans: { [number]: ScanDataType } |};

export type GetScanScheduleType = {||};

export type ScanScheduleType = {|
  imScanTimeoutSec?: number,
  pbfScanTimeoutSec?: number
|};

export type GetSlotMapConfigType = {||};

export type SlotType = {| start: number, len: number |};

export type SlotPurposeType =
  | "SP_IM"
  | "SP_PBF"
  | "SP_RTAC"
  | "SP_VBF"
  | "SP_NULLING"
  | "SP_IGNITION"
  | "SP_HYBRID_PBF";
export const SlotPurposeValueMap = {
  SP_IM: 0,
  SP_PBF: 1,
  SP_RTAC: 2,
  SP_VBF: 3,
  SP_NULLING: 4,
  SP_IGNITION: 5,
  SP_HYBRID_PBF: 6
};

export type SlotMapConfigType = {|
  slotLen: number,
  periodLen: number,
  mapping: { [SlotPurposeType]: SlotType[] }
|};

export type SyncLinkMonitorType = {||};

export type InjectKvStoreKeysType = {||};

export type GetRoutingAdjacenciesType = {||};

export type RoutingAdjacenciesType = {|
  adjacencyMap: { [string]: Lsdb.AdjacencyDatabaseType },
  prefixMap: { [string]: Lsdb.PrefixDatabaseType }
|};

export type SetLinkMetricType = {| macAddr: string, metric: number |};

export type IperfTransportProtocolType = "TCP" | "UDP";
export const IperfTransportProtocolValueMap = {
  TCP: 6,
  UDP: 17
};

export type IperfOptionsType = {|
  bitrate?: Buffer,
  timeSec?: number,
  protocol?: IperfTransportProtocolType,
  intervalSec?: number,
  windowSize?: Buffer,
  mss?: number,
  noDelay?: boolean,
  omitSec?: number,
  verbose?: boolean
|};

export type StartIperfType = {|
  srcNodeId: string,
  dstNodeId: string,
  dstNodeIpv6?: string,
  options?: IperfOptionsType
|};

export type StartIperfRespType = {| id: string |};

export type StartMinionIperfType = {|
  iperfConfig: StartIperfType,
  serverPort: number,
  id: string
|};

export type StopIperfType = {| id: string |};

export type GetIperfStatusType = {||};

export type IperfStatusType = {|
  sessions: { [string]: StartMinionIperfType }
|};

export type IperfOutputType = {|
  output: string,
  startIperf: StartMinionIperfType,
  isServer: boolean
|};

export type BinaryStarFsmStateType =
  | "STATE_PRIMARY"
  | "STATE_BACKUP"
  | "STATE_ACTIVE"
  | "STATE_PASSIVE";
export const BinaryStarFsmStateValueMap = {
  STATE_PRIMARY: 1,
  STATE_BACKUP: 2,
  STATE_ACTIVE: 3,
  STATE_PASSIVE: 4
};

export type BinaryStarFsmEventType =
  | "PEER_PRIMARY"
  | "PEER_BACKUP"
  | "PEER_ACTIVE"
  | "PEER_PASSIVE"
  | "CLIENT_REQUEST";
export const BinaryStarFsmEventValueMap = {
  PEER_PRIMARY: 1,
  PEER_BACKUP: 2,
  PEER_ACTIVE: 3,
  PEER_PASSIVE: 4,
  CLIENT_REQUEST: 5
};

export type BinaryStarType = {|
  state: BinaryStarFsmStateType,
  peerExpiry: Buffer
|};

export type BinaryStarGetAppDataType = {||};

export type BinaryStarAppDataType = {|
  topology?: Topology.TopologyType,
  configNetworkOverrides?: string,
  configNodeOverrides?: string
|};

export type BinaryStarSyncType = {|
  state: BinaryStarFsmStateType,
  seqNum: number,
  data: BinaryStarAppDataType
|};

export type BinaryStarSwitchControllerType = {||};

export type BinaryStarGetStateType = {||};

export type MessageType = {|
  mType: MessageTypeType,
  value: Buffer,
  compressed?: boolean,
  compressionFormat?: CompressionFormatType
|};

export type CompressionFormatType = "SNAPPY";
export const CompressionFormatValueMap = {
  SNAPPY: 1
};

export type HelloType = {||};

export type E2EAckType = {| success: boolean, message: string |};

export type BgpNeighborType = {| asn: Buffer, ipv6: string |};

export type BgpNeighborsType = {| neighbors: BgpNeighborType[] |};

export type BgpConfigType = {|
  localAsn: Buffer,
  neighbors: BgpNeighborType[]
|};

export type NetworkInfoType = {|
  e2eCtrlUrl: string,
  e2eCtrlUrlBackup: string,
  aggrCtrlUrl: string[],
  network: string,
  bgpNeighbors: BgpNeighborsType,
  bgpConfig: BgpConfigType,
  dhcpNameServer: string,
  dhcpRangeMin: Buffer,
  dhcpRangeMax: Buffer,
  dhcpGlobalConfigAppend: string
|};

export type EmptyType = {||};
