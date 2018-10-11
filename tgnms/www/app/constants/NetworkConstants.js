/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {polarityColor} from '../helpers/NetworkHelpers.js';

export const Actions = {
  // topology actions
  TOPOLOGY_SELECTED: 'TOPOLOGY_SELECTED',
  TOPOLOGY_REFRESHED: 'TOPOLOGY_REFRESHED',
  TOPOLOGY_LIST_REFRESHED: 'TOPOLOGY_LIST_REFRESHED',
  // nms aggregator
  AGGREGATOR_DUMP_REFRESHED: 'AGGREGATOR_DUMP_REFRESHED',
  // map/table selections
  NODE_SELECTED: 'NODE_SELECTED',
  LINK_SELECTED: 'LINK_SELECTED',
  SITE_SELECTED: 'SITE_SELECTED',
  DISPLAY_ROUTE: 'DISPLAY_ROUTE',
  CLEAR_ROUTE: 'CLEAR_ROUTE',
  MAP_DIMENSIONS: 'MAP_DIMENSIONS',
  CLEAR_NODE_LINK_SELECTED: 'CLEAR_NODE_LINK_SELECTED',
  // primary pane view
  VIEW_SELECTED: 'VIEW_SELECTED',
  TAB_SELECTED: 'TAB_SELECTED',

  PLANNED_SITE_CREATE: 'PLANNED_SITE_CREATE',
  START_SITE_EDIT: 'START_SITE_EDIT',
  // url location
  URL_CHANGED: 'URL_CHANGED',
  CHANGE_URL: 'CHANGE_URL',
  // notify of a single layer change
  // Layer 1 - view (map, stats, events, alerts, )
  // layer 2 - tab (nodes, links, sites, )
  // layer 3 - selected node, link, etc
  LAYER_CHANGED: 'LAYER_CHANGED',
  // network health
  LINK_HEALTH_REFRESHED: 'LINK_HEALTH_REFRESHED',
  NODE_HEALTH_REFRESHED: 'NODE_HEALTH_REFRESHED',
  LINK_OVERLAY_REFRESHED: 'LINK_OVERLAY_REFRESHED',
  ANALYZER_REFRESHED: 'ANALYZER_REFRESHED',
  SCAN_REFRESHED: 'SCAN_REFRESHED',
  SCAN_FETCH: 'SCAN_FETCH',

  // upgrade actions (UI related)
  OPEN_UPGRADE_BINARY_MODAL: 'OPEN_UPGRADE_BINARY_MODAL',
  OPEN_PREPARE_UPGRADE_MODAL: 'OPEN_PREPARE_UPGRADE_MODAL',
  OPEN_COMMIT_UPGRADE_MODAL: 'OPEN_COMMIT_UPGRADE_MODAL',
  OPEN_ABORT_UPGRADE_MODAL: 'OPEN_ABORT_UPGRADE_MODAL',
  OPEN_RESET_STATUS_MODAL: 'OPEN_RESET_STATUS_MODAL',

  UPGRADE_NODES_SELECTED: 'UPGRADE_NODES_SELECTED',

  // upgrade file-related actions
  UPGRADE_IMAGES_LOADED: 'UPGRADE_IMAGES_LOADED',
  FETCH_UPGRADE_IMAGES_FAILED: 'FETCH_UPGRADE_IMAGES_FAILED',

  UPGRADE_UPLOAD_STATUS: 'UPGRADE_UPLOAD_STATUS',
  UPGRADE_UPLOAD_PROGRESS: 'UPGRADE_UPLOAD_PROGRESS',

  UPGRADE_DELETE_IMAGE_STATUS: 'UPGRADE_DELETE_IMAGE_STATUS',

  // show/hide topology issues
  TOPOLOGY_ISSUES_PANE: 'TOPOLOGY_ISSUES_PANE',

  // pending topology
  PENDING_TOPOLOGY: 'PENDING_TOPOLOGY',
};

export const SiteOverlayKeys = {
  Health: {
    Healthy: {color: 'green'},
    Unhealthy: {color: 'red'},
    Partial: {color: 'orange'},
    Empty: {color: 'gray'},
  },
  Polarity: {
    Odd: {color: polarityColor(1)},
    Even: {color: polarityColor(2)},
    Hybrid: {color: polarityColor(3)},
  },
  Pending: {
    Site: {color: 'pink'},
    Node: {color: 'pink'},
  },
  CommitPlan: {
    Full: {color: 'blue'},
    Partial: {color: 'orange'},
    None: {color: 'green'},
  },
};

export const ChartColors = ['#9F1E11', '#9F6B11', '#620C68', '#0D7825'];

export const LinkOverlayKeys = {
  Health: {
    name: 'Health',
    metric: null,
  },
  Uptime: {
    name: 'Uptime',
    metric: null,
    values: [99, 99.9, 99.99],
    colors: [
      'hsl(0,100%,40%)',
      'hsl(50,100%,40%)',
      'hsl(120,100%,40%)',
      'hsl(120,100%,20%)',
    ],
    prefix: 'Less than',
  },
  RxGolayIdx: {
    name: 'RxGolayIdx',
    metric: null,
    values: [0, 1, 2, 3, 4, 5, 6, 7],
    colors: [
      'hsl(0,50%,50%)',
      'hsl(170,50%,50%)',
      'hsl(30,50%,50%)',
      'hsl(200,50%,50%)',
      'hsl(60,50%,50%)',
      'hsl(240,50%,50%)',
      'hsl(100,50%,50%)',
      'hsl(280,50%,50%)',
    ],
  },
  TxGolayIdx: {
    name: 'TxGolayIdx',
    metric: null,
    values: [0, 1, 2, 3, 4, 5, 6, 7],
    colors: [
      'hsl(0,50%,50%)',
      'hsl(170,50%,50%)',
      'hsl(30,50%,50%)',
      'hsl(200,50%,50%)',
      'hsl(60,50%,50%)',
      'hsl(240,50%,50%)',
      'hsl(100,50%,50%)',
      'hsl(280,50%,50%)',
    ],
  },
  SNR: {
    name: 'SNR',
    metric: 'snr',
    values: [5, 10, 15, 20],
    colors: [
      'hsl(0,100%,20%)',
      'hsl(0,100%,40%)',
      'hsl(50,100%,40%)',
      'hsl(120,100%,40%)',
      'hsl(120,100%,20%)',
    ],
    prefix: 'Less than',
  },
  MCS: {
    name: 'MCS',
    metric: 'mcs',
    values: [6, 7, 8, 9],
    colors: [
      'hsl(0,100%,20%)',
      'hsl(0,100%,40%)',
      'hsl(50,100%,40%)',
      'hsl(120,100%,40%)',
      'hsl(120,100%,20%)',
    ],
    prefix: 'Less than',
  },
  RSSI: {
    name: 'RSSI',
    metric: 'rssi',
    values: [-40, -35, -30, -25],
    colors: [
      'hsl(0,100%,20%)',
      'hsl(0,100%,40%)',
      'hsl(50,100%,40%)',
      'hsl(120,100%,40%)',
      'hsl(120,100%,20%)',
    ],
    prefix: 'Less than',
  },
  CommitPlan: {
    name: 'Commit Plan',
    metric: null,
    values: ['Not Included', 'Included'],
    colors: ['green', 'blue'],
  },
  /*FLAPS: {
    name: 'Link Flaps',
    metric: 'flaps',
    // not used
    values: [1, 3, 5, 10, 15, 25, 50],
    colors: [
      'hsl(120, 100%, 40%)',
      'hsl(75, 100%, 40%)',
      'hsl(30, 100%, 50%)',
      'hsl(15, 100%, 30%)',
      'hsl(0, 100%, 60%)',
      'hsl(0, 100%, 40%)',
      'hsl(0, 100%, 30%)',
      'hsl(0, 100%, 20%)',
    ],
    prefix: 'Less than',
  },*/
};

export const UploadStatus = {
  NONE: 'NONE',
  UPLOADING: 'UPLOADING',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
};

export const DeleteStatus = {
  NONE: 'NONE',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
};

// From SiteOverlayKeys.CommitPlan
export const CommitPlanSiteState = {
  FULL: 'Full',
  PARTIAL: 'Partial',
  NONE: 'None',
};

// marker/line constants
export const MapDimensions = {
  Default: {
    SITE_RADIUS: 10,
    LINK_LINE_WEIGHT: 6,
  },
  BigLine: {
    SITE_RADIUS: 3,
    LINK_LINE_WEIGHT: 10,
  },
};
export const MapTiles = {
  Default: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  Monochrome: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png',
};

export const E2E = {
  PrimaryController: 'Primary Controller',
  BackupController: 'Backup Controller',
  Aggregator: 'Aggregator',
};

export const ControllerPeerType = {
  Primary: 'primary',
  Backup: 'backup',
};

export const HighAvailability = {
  OFFLINE: null,
  UNINITIALIZED: 0,
};
