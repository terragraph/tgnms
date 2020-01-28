/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import blue from '@material-ui/core/colors/blue';
import brown from '@material-ui/core/colors/brown';
import green from '@material-ui/core/colors/green';
import grey from '@material-ui/core/colors/grey';
import lightGreen from '@material-ui/core/colors/lightGreen';
import orange from '@material-ui/core/colors/orange';
import purple from '@material-ui/core/colors/purple';
import red from '@material-ui/core/colors/red';
import {HEALTH_CODES, HEALTH_DEFS} from './HealthConstants';
import {MCS_DATARATE_TABLE} from './NetworkConstants';
import {formatNumber} from '../helpers/StringHelpers';
const MEGABITS = Math.pow(1000, 2);

import type {Overlay} from '../views/map/NetworkMapTypes';

export const LinkOverlayColors = {
  ignition_status: {
    link_up: {color: green[800]},
    link_down: {color: red[600]},
    igniting: {color: purple[500]},
    unknown: {color: grey[500]},
  },
  metric: {
    excellent: {color: green[800]},
    good: {color: lightGreen[500]},
    marginal: {color: orange[500]},
    poor: {color: red[600]},
    missing: {color: grey[500]},
  },
};

export const SiteOverlayColors = {
  health: {
    healthy: {color: green[800]},
    unhealthy: {color: red[600]},
    partial: {color: orange[500]},
    empty: {color: grey[500]},
  },
  polarity: {
    odd: {color: blue[500]},
    even: {color: brown[500]},
    hybrid_odd: {color: green[800]},
    hybrid_even: {color: purple[500]},
    hw_hybrid: {color: orange[500]},
    unknown: {color: red[600]},
  },
};

// range of colors for metric overlays from best to worst
export const METRIC_COLOR_RANGE = [
  LinkOverlayColors.metric.excellent.color,
  LinkOverlayColors.metric.good.color,
  LinkOverlayColors.metric.marginal.color,
  LinkOverlayColors.metric.poor.color,
];

// Colors used for link overlays of
// attributes with discrete values that
// do not have a "best to worst" relationship
export const INDEX_COLORS = [
  'hsl(0,50%,50%)',
  'hsl(170,50%,50%)',
  'hsl(30,50%,50%)',
  'hsl(200,50%,50%)',
  'hsl(60,50%,50%)',
  'hsl(240,50%,50%)',
  'hsl(100,50%,50%)',
  'hsl(280,50%,50%)',
];

// colors per control superframe
export const SUPERFRAME_COLORS = {
  [0]: 'hsl(170,50%,50%)',
  [1]: 'hsl(30,50%,50%)',
  [255]: 'hsl(200,50%,50%)',
};

export const NETWORK_TEST_HEALTH_COLOR_RANGE = [
  HEALTH_DEFS[HEALTH_CODES.EXCELLENT].color,
  HEALTH_DEFS[HEALTH_CODES.HEALTHY].color,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].color,
  HEALTH_DEFS[HEALTH_CODES.WARNING].color,
  HEALTH_DEFS[HEALTH_CODES.UNKNOWN].color,
  HEALTH_DEFS[HEALTH_CODES.DOWN].color,
];

// === SITES ===
// === Base paint (for all site types) ===
export const POSITION_CIRCLE_PAINT = {
  'circle-blur': 0.15,
  'circle-color': ['get', 'siteColor'],
  'circle-radius': ['get', 'circleRadius'],
  'circle-stroke-color': ['get', 'strokeColor'],
  'circle-stroke-opacity': 0.6,
  'circle-stroke-width': ['get', 'strokeWidth'],
};
export const CIRCLE_RADIUS = 10;
export const INNER_CIRCLE_RADIUS = 5;

// === Inner circle paint (for special site types) ===
// TODO - Make a legend for this
export const POP_SITE_COLOR = 'blue';
export const CN_SITE_COLOR = 'pink';

// === Selected site paint ===
export const SELECTED_CIRCLE_STROKE_COLOR = '#0077ff';
export const SELECTED_CIRCLE_STROKE_WIDTH = 5;

// === Planned site paint ===
export const PLANNED_SITE_COLOR = '#fff';
export const PLANNED_SITE_STROKE_COLOR = '#000';

// === "Search Nearby" site paint ===
export const SEARCH_NEARBY_SITE_COLOR = '#eee';
export const SEARCH_NEARBY_STROKE_COLOR = '#aec6cf';
export const SEARCH_NEARBY_STROKE_WIDTH = 5;

// === LINK LINES ===
// each link render type gets 2 mapboxgl layers
export const LinkRenderType = {
  HIDDEN: null,
  NORMAL: 'link-normal',
  BACKUP_CN: 'link-backup-cn',
  WIRED_INTERSITE: 'link-wired-intersite',
};

export const LINE_PAINT = {
  'line-color': ['get', 'linkColor'],
  'line-width': 8,
};

export const LINE_BACKUP_CN_PAINT = {
  ...LINE_PAINT,
  'line-dasharray': [0.05, 1.5],
};

export const LINE_WIRED_INTERSITE_PAINT = {
  ...LINE_PAINT,
  'line-dasharray': [0.02, 1.5],
};

export const LINE_LAYOUT = {
  'line-join': 'round',
  'line-cap': 'round',
};

// === Selected link casing ===
export const LINE_CASING_PAINT = {
  'line-gap-width': LINE_PAINT['line-width'],
  'line-color': '#0077ff',
  'line-width': 4,
  'line-opacity': 0.6,
};

// === Link overlay text (e.g. for link metrics) ===
export const LINE_TEXT_PAINT = {
  'text-color': '#fff',
  'text-halo-color': '#444',
  'text-halo-width': 1,
  'text-halo-blur': 1,
};

export const LINE_TEXT_LAYOUT = {
  'text-field': '{text}',
  'text-size': 14,
  'text-anchor': 'center',
  'text-allow-overlap': true,
  'text-ignore-placement': true,
  // Place the text on the line...
  // TODO use 'line-center' (mapbox-gl-js >= 0.47.0)
  'symbol-placement': 'line',
  // TODO weird behavior... should be very high (~10000) to avoid duplication,
  // but text won't always appear on the line without a low value (~100)
  'symbol-spacing': 80,
};

// === "Search Nearby" links ===
export const SEARCH_NEARBY_LINE_PAINT = {
  'line-color': '#aec6cf',
  'line-width': 3,
  'line-dasharray': [1, 2],
};
export const SEARCH_NEARBY_FILL_PAINT = {
  'fill-color': '#aec6cf',
  'fill-opacity': 0.3,
};

export const MINUTES_IN_DAY = 1440;
export const STEP_SIZE = 60;
export const INTERVAL_SEC = 30;
export const MILLISECONDS_TO_MINUTES = 60000;

// map overlay layers
export const overlayLayers = [
  {
    layerId: 'link_lines',
    name: 'Link Lines',
  },
  {
    layerId: 'site_icons',
    name: 'Site Icons',
  },
  {
    layerId: 'site_name_popups',
    name: 'Site Name Popups',
  },
  {
    layerId: 'buildings_3d',
    name: '3D Buildings',
  },
];

export const SITE_METRIC_OVERLAYS: {[string]: Overlay} = {
  health: {name: 'Health', type: 'health', id: 'health'},
  polarity: {name: 'Polarity', type: 'polarity', id: 'polarity'},
};

export const HISTORICAL_SITE_METRIC_OVERLAYS: {[string]: Overlay} = {
  node_online: {
    name: 'Node Online',
    type: 'metric',
    id: 'node_online',
  },
};

export const HISTORICAL_LINK_METRIC_OVERLAYS: {[string]: Overlay} = {
  link_online: {
    name: 'Online',
    type: 'metric',
    id: 'link_online',
    overlayLegendType: 'ignition_status',
    range: [1, 0.5, 0.5, 0],
    bounds: [0, 1],
  },
};

export const LINK_METRIC_OVERLAYS: {[string]: Overlay} = {
  //{name: 'Performance Health', id: 'perf_health'},
  //{name: 'Availability', id: 'availability'},
  //{name: 'Uptime', id: 'uptime'},
  ignition_status: {
    name: 'Ignition Status',
    type: 'ignition_status',
    id: 'ignition_status',
  },
  golay_tx: {name: 'Golay (TX)', type: 'golay', id: 'golay_tx'},
  golay_rx: {name: 'Golay (RX)', type: 'golay', id: 'golay_rx'},
  control_superframe: {
    name: 'Control Superframe',
    type: 'superframe',
    id: 'control_superframe',
  },
  snr: {
    name: 'SNR',
    type: 'metric',
    id: 'snr',
    range: [24, 18, 12, 0],
    units: 'dB',
    bounds: [0, 50],
  },
  mcs: {
    name: 'MCS',
    type: 'metric',
    id: 'mcs',
    range: [12, 9, 7, 0],
    bounds: [0, 12],
  },
  rssi: {
    name: 'RSSI',
    type: 'metric',
    id: 'rssi',
    range: [-15, -30, -40, -100],
    units: 'dBm',
    bounds: [0, -100],
  },
  tx_power: {
    name: 'Tx Power',
    type: 'metric',
    id: 'tx_power',
    range: [1, 5, 10, 100],
    bounds: [0, 100],
  },
  link_utilization_mbps: {
    name: 'Link Utilization (mbps)',
    type: 'metric',
    id: 'link_utilization_mbps',
    metrics: ['tx_bytes', 'rx_bytes'],
    // thresholds aren't scientific
    range: [0.1, 250, 500, 2000],
    bounds: [0, 2000],
    units: 'mbps',
    aggregate: (metricData: any) => {
      if (metricData === null) {
        return -1;
      }
      const {rx_bytes, tx_bytes} = metricData;
      const totalTrafficBps =
        ((Number.parseFloat(rx_bytes) + Number.parseFloat(tx_bytes)) * 8) /
        1000.0;
      return totalTrafficBps / 1000.0 / 1000.0;
    },
    formatText: (_link, value: number) => {
      return value >= 0 ? `${formatNumber(value, 1)} mbps` : '';
    },
  },
  link_utilization_mcs: {
    name: 'Link Utilization (MCS rate)',
    type: 'metric',
    id: 'link_utilization_mcs',
    metrics: ['tx_bytes', 'rx_bytes', 'mcs'],
    range: [0.1, 1, 10, 100],
    bounds: [0, 100],
    units: '%',
    aggregate: (metricData: any) => {
      if (metricData === null) {
        return -1;
      }
      const {rx_bytes, tx_bytes, mcs} = metricData;
      const mcsCapacityBits = MCS_DATARATE_TABLE[mcs];
      const totalTrafficBps =
        ((Number.parseFloat(rx_bytes) + Number.parseFloat(tx_bytes)) * 8) /
        1000.0;
      return (totalTrafficBps / mcsCapacityBits) * 100.0;
    },
    formatText: (_link, value: number) => {
      return value >= 0 ? `${formatNumber(value, 1)}%` : '';
    },
  },
  channel: {
    name: 'Channel',
    type: 'channel',
    id: 'channel',
  },
};

export const TEST_EXECUTION_LINK_OVERLAYS: {[string]: Overlay} = {
  health: {
    name: 'Health',
    type: 'metric',
    id: 'health',
    range: [0, 1, 2, 3, 4],
    bounds: [0, 4],
    colorRange: NETWORK_TEST_HEALTH_COLOR_RANGE,
    formatText: (_link, health: number) => {
      const healthDef = HEALTH_DEFS[health];
      if (!healthDef) {
        return 'unknown';
      }
      return healthDef.name;
    },
  },
  mcs_avg: {
    name: 'MCS',
    type: 'metric',
    id: 'mcs_avg',
    range: [12, 9, 7, 0],
    bounds: [0, 12],
  },
  iperf_throughput_mean: {
    name: 'Iperf Throughput',
    type: 'metric',
    id: 'iperf_throughput_mean',
    //TODO: make these dynamic based on test execution id
    range: [200, 150, 80, 40],
    bounds: [0, 200],
    aggregate: (metricData: any) => {
      if (!metricData) {
        return 0;
      }
      return (metricData.iperf_throughput_mean || 0) / MEGABITS;
    },
    formatText: (_link, value: number) => {
      return formatNumber(value, 1);
    },
  },
};
