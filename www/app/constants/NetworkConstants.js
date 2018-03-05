import { polarityColor } from "../NetworkHelper.js";

const Actions = {
  // topology actions
  TOPOLOGY_SELECTED: 100,
  TOPOLOGY_REFRESHED: 101,
  TOPOLOGY_LIST_REFRESHED: 102,
  // nms aggregator
  AGGREGATOR_DUMP_REFRESHED: 150,
  // map/table selections
  NODE_SELECTED: 200,
  LINK_SELECTED: 201,
  SITE_SELECTED: 202,
  DISPLAY_ROUTE: 203,
  CLEAR_ROUTE: 204,
  MAP_DIMENSIONS: 205,
  CLEAR_NODE_LINK_SELECTED: 290,
  // primary pane view
  VIEW_SELECTED: 300,
  TAB_SELECTED: 302,

  PLANNED_SITE_CREAT: 330,
  // url location
  URL_CHANGED: 350,
  CHANGE_URL: 351,
  // notify of a single layer change
  // Layer 1 - view (map, stats, events, alerts, )
  // layer 2 - tab (nodes, links, sites, )
  // layer 3 - selected node, link, etc
  LAYER_CHANGED: 352,
  // network health
  HEALTH_REFRESHED: 400,
  LINK_OVERLAY_REFRESHED: 401,
  ANALYZER_REFRESHED: 402,
  SCAN_REFRESHED: 403,
  SCAN_FETCH: 404,

  // upgrade actions (UI related)
  OPEN_UPGRADE_BINARY_MODAL: 500,
  OPEN_PREPARE_UPGRADE_MODAL: 501,
  OPEN_COMMIT_UPGRADE_MODAL: 502,
  OPEN_ABORT_UPGRADE_MODAL: 503,

  UPGRADE_NODES_SELECTED: 520,

  // upgrade file-related actions
  UPGRADE_IMAGES_LOADED: 530,
  FETCH_UPGRADE_IMAGES_FAILED: 531,

  UPGRADE_UPLOAD_STATUS: 532,
  UPGRADE_UPLOAD_PROGRESS: 533,

  UPGRADE_DELETE_IMAGE_STATUS: 541,

  // show/hide topology issues
  TOPOLOGY_ISSUES_PANE: 600,

  // pending topology
  PENDING_TOPOLOGY: 700,

  // network config actions can be found in NetworkConfigActions.js
  COMMIT_PLAN_BATCH: 800
};

const SiteOverlayKeys = {
  Health: {
    Healthy: { color: "green" },
    Unhealthy: { color: "red" },
    Partial: { color: "orange" },
    Empty: { color: "gray" }
  },
  Polarity: {
    Odd: { color: polarityColor(1) },
    Even: { color: polarityColor(2) },
    Hybrid: { color: polarityColor(3) }
  },
  Pending: {
    Site: { color: "pink" },
    Node: { color: "pink" }
  },
  CommitPlan: {
    Full: { color: "red" },
    Partial: { color: "orange" },
    None: { color: "green" },
    NoData: { color: "black" }
  }
};

const ChartColors = ["#9F1E11", "#9F6B11", "#620C68", "#0D7825"];

const linkOverlayKeys = {
  Health: {
    name: "Health",
    metric: null
  },
  Uptime: {
    name: "Uptime",
    metric: null,
    values: [99, 99.9, 99.99],
    colors: [
      "hsl(0,100%,40%)",
      "hsl(50,100%,40%)",
      "hsl(120,100%,40%)",
      "hsl(120,100%,20%)"
    ]
  },
  RxGolayIdx: {
    name: "RxGolayIdx",
    metric: null,
    values: [0, 1, 2, 3, 4, 5, 6, 7],
    colors: [
      "hsl(0,50%,50%)",
      "hsl(170,50%,50%)",
      "hsl(30,50%,50%)",
      "hsl(200,50%,50%)",
      "hsl(60,50%,50%)",
      "hsl(240,50%,50%)",
      "hsl(100,50%,50%)",
      "hsl(280,50%,50%)"
    ]
  },
  TxGolayIdx: {
    name: "TxGolayIdx",
    metric: null,
    values: [0, 1, 2, 3, 4, 5, 6, 7],
    colors: [
      "hsl(0,50%,50%)",
      "hsl(170,50%,50%)",
      "hsl(30,50%,50%)",
      "hsl(200,50%,50%)",
      "hsl(60,50%,50%)",
      "hsl(240,50%,50%)",
      "hsl(100,50%,50%)",
      "hsl(280,50%,50%)"
    ]
  },
  SNR: {
    name: "SNR",
    metric: "snr",
    values: [5, 10, 15, 20],
    colors: [
      "hsl(0,100%,20%)",
      "hsl(0,100%,40%)",
      "hsl(50,100%,40%)",
      "hsl(120,100%,40%)",
      "hsl(120,100%,20%)"
    ]
  },
  MCS: {
    name: "MCS",
    metric: "mcs",
    values: [6, 7, 8, 9],
    colors: [
      "hsl(0,100%,20%)",
      "hsl(0,100%,40%)",
      "hsl(50,100%,40%)",
      "hsl(120,100%,40%)",
      "hsl(120,100%,20%)"
    ]
  },
  RSSI: {
    name: "RSSI",
    metric: "rssi",
    values: [-40, -35, -30, -25],
    colors: [
      "hsl(0,100%,20%)",
      "hsl(0,100%,40%)",
      "hsl(50,100%,40%)",
      "hsl(120,100%,40%)",
      "hsl(120,100%,20%)"
    ]
  },
  FLAPS: {
    name: "Link Flaps",
    metric: "flaps",
    // not used
    values: [1, 3, 5, 10, 15, 25, 50],
    colors: [
      "hsl(120, 100%, 40%)",
      "hsl(75, 100%, 40%)",
      "hsl(30, 100%, 50%)",
      "hsl(15, 100%, 30%)",
      "hsl(0, 100%, 60%)",
      "hsl(0, 100%, 40%)",
      "hsl(0, 100%, 30%)",
      "hsl(0, 100%, 20%)"
    ]
  },
  CommitPlan: {
    name: "Commit Plan",
    metric: "commit_plan",
    colors: ["green", "red"]
  }
};

const UploadStatus = {
  NONE: "NONE",
  UPLOADING: "UPLOADING",
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE"
};

const DeleteStatus = {
  NONE: "NONE",
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE"
};
// marker/line constants
const MapDimensions = {
  Default: {
    SITE_RADIUS: 10,
    LINK_LINE_WEIGHT: 6
  },
  BigLine: {
    SITE_RADIUS: 3,
    LINK_LINE_WEIGHT: 10
  }
};
const MapTiles = {
  Default: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  Monochrome: "//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png"
};

module.exports = {
  Actions,
  MapDimensions,
  MapTiles,
  SiteOverlayKeys,
  linkOverlayKeys,
  UploadStatus,
  DeleteStatus,
  ChartColors
};
