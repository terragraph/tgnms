/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import blue from '@material-ui/core/colors/blue';
import brown from '@material-ui/core/colors/brown';
import grey from '@material-ui/core/colors/grey';
import lightGreen from '@material-ui/core/colors/lightGreen';
import purple from '@material-ui/core/colors/purple';
import red from '@material-ui/core/colors/red';
import {HEALTH_CODES, HEALTH_DEFS} from './HealthConstants';
import {MCS_DATARATE_TABLE} from './NetworkConstants';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
//TODO don't import from views
import PrefixZoneOverlay from '@fbcnms/tg-nms/app/views/map/overlays/PrefixZoneOverlay';
import {ANP_STATUS_TYPE} from './TemplateConstants';
import {createQuery} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';
import {isFeatureEnabled} from './FeatureFlags';
import {numToMegabits} from '@fbcnms/tg-nms/app/helpers/ScheduleHelpers';

import type {
  LayerData,
  Overlay,
} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

export const TG_COLOR = {
  GREEN: '#31A24C',
  PURPLE: '#A73FC0',
  RED: '#E85535',
  GREY: '#939AA7',
  ORANGE: '#FC8F03',
  PINK: '#FFC0CA',
  BLUE: '#2D4CD2',
};

export const LinkOverlayColors = {
  ignition_status: {
    link_up: {color: TG_COLOR.GREEN},
    link_down: {color: TG_COLOR.RED},
    igniting: {color: TG_COLOR.PURPLE},
    planned: {color: TG_COLOR.GREY},
  },
  golay: {
    [0]: {color: 'hsl(0,50%,50%)'},
    [1]: {color: 'hsl(170,50%,50%)'},
    [2]: {color: 'hsl(30,50%,50%)'},
    [3]: {color: 'hsl(200,50%,50%)'},
    [4]: {color: 'hsl(60,50%,50%)'},
    [5]: {color: 'hsl(240,50%,50%)'},
    [6]: {color: 'hsl(100,50%,50%)'},
    [7]: {color: 'hsl(280,50%,50%)'},
  },
  channel: {
    [1]: {color: 'hsl(170,50%,50%)', label: '1 (58.32 GHz)'},
    [2]: {color: 'hsl(30,50%,50%)', label: '2 (60.48 GHz)'},
    [3]: {color: 'hsl(200,50%,50%)', label: '3 (62.64 GHz)'},
    [4]: {color: 'hsl(60,50%,50%)', label: '4 (64.80 GHz)'},
  },
  superframe: {
    [0]: {color: 'hsl(170,50%,50%)'},
    [1]: {color: 'hsl(30,50%,50%)'},
    [255]: {color: 'hsl(200,50%,50%)'},
  },
  metric: {
    excellent: {color: TG_COLOR.GREEN},
    good: {color: lightGreen[500]},
    marginal: {color: TG_COLOR.ORANGE},
    poor: {color: TG_COLOR.RED},
    missing: {color: TG_COLOR.GREY},
  },
  topology: {
    added: {color: TG_COLOR.GREEN},
    hardware_change: {color: TG_COLOR.ORANGE},
    removed: {color: TG_COLOR.RED},
    no_change: {color: TG_COLOR.GREY},
  },
};

export const LinkInterferenceColors = [
  HEALTH_DEFS[HEALTH_CODES.EXCELLENT].color,
  HEALTH_DEFS[HEALTH_CODES.POOR].color,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].color,
  blue[200],
];

export const SiteOverlayColors = {
  health: {
    healthy: {color: TG_COLOR.GREEN},
    unhealthy: {color: TG_COLOR.RED},
    partial: {color: TG_COLOR.ORANGE},
    planned: {color: TG_COLOR.GREY},
  },
  polarity: {
    odd: {color: blue[500]},
    even: {color: brown[500]},
    hybrid_odd: {color: TG_COLOR.GREEN},
    hybrid_even: {color: purple[500]},
    hw_hybrid: {color: TG_COLOR.ORANGE},
    unknown: {color: TG_COLOR.RED},
  },
  topology: {
    added: {color: TG_COLOR.GREEN},
    hardware_change: {color: TG_COLOR.ORANGE},
    removed: {color: TG_COLOR.RED},
    no_change: {color: TG_COLOR.GREY},
  },
};

export const NodeOverlayColors = {
  health: {
    healthy: {color: TG_COLOR.GREEN},
    unhealthy: {color: red[700]},
    partial: {color: TG_COLOR.ORANGE},
    planned: {color: grey[400]},
  },
};

// === Inner circle paint (for special site types) ===
export const POP_SITE_COLOR = TG_COLOR.BLUE;
export const CN_SITE_COLOR = TG_COLOR.PINK;

export const SpecialNodeOverlayColors = {
  POP: {color: TG_COLOR.BLUE},
  client: {color: TG_COLOR.PINK},
};

export const TestOverlayColors = {
  health: {
    excellent: {color: HEALTH_DEFS[HEALTH_CODES.EXCELLENT].color},
    good: {color: HEALTH_DEFS[HEALTH_CODES.GOOD].color},
    marginal: {color: HEALTH_DEFS[HEALTH_CODES.MARGINAL].color},
    poor: {color: HEALTH_DEFS[HEALTH_CODES.POOR].color},
    missing: {color: HEALTH_DEFS[HEALTH_CODES.MISSING].color},
  },
  metric: {
    excellent: {color: TG_COLOR.GREEN},
    good: {color: lightGreen[500]},
    marginal: {color: TG_COLOR.ORANGE},
    poor: {color: TG_COLOR.RED},
    missing: {color: TG_COLOR.GREY},
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
  HEALTH_DEFS[HEALTH_CODES.GOOD].color,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].color,
  HEALTH_DEFS[HEALTH_CODES.POOR].color,
  HEALTH_DEFS[HEALTH_CODES.MISSING].color,
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
export const CIRCLE_RADIUS = 6;
export const INNER_CIRCLE_RADIUS = 4;

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
  'line-width': 5,
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

/**
 * Maps from mcs to colors and blends colors in-between
 * https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#interpolate
 */
export const MCS_INTERPOLATE_FILL_COLOR = [
  0,
  '#eeeeee', //grey
  5,
  '#ff0000', //red
  9,
  '#ffff00', //yellow
  12,
  '#00ff00', //green
];

export const MINUTES_IN_DAY = 1440;
export const STEP_SIZE = 60;
export const INTERVAL_SEC = 30;
export const MILLISECONDS_TO_MINUTES = 60000;

export const mapLayers: Array<{|
  layerId: $Keys<LayerData<*>>,
  name: string,
  // If the layer can be enabled/disabled - default true
  toggleable?: boolean,
  /**
   * Static layers cannot have their overlay changed and do not require
   * an overlay config to render.
   */
  isStatic?: boolean,
|}> = [
  {
    layerId: 'link_lines',
    name: 'Links',
    toggleable: false,
  },
  {
    layerId: 'site_icons',
    name: 'Sites',
    toggleable: false,
  },
  {
    layerId: 'nodes',
    name: 'Nodes',
    toggleable: false,
  },
  {
    layerId: 'area_polygons',
    name: 'Areas',
    toggleable: false,
  },
  ...(isFeatureEnabled('ALERTS_LAYER_ENABLED')
    ? [
        {
          layerId: 'alert_popups',
          name: 'Alert Icons',
          isStatic: true,
        },
      ]
    : []),
  {
    layerId: 'site_name_popups',
    name: 'Site Names',
    isStatic: true,
  },
  {
    layerId: 'buildings_3d',
    name: '3D Buildings',
    isStatic: true,
  },
];

type Overlays = {[string]: Overlay};

export const OVERLAY_NONE: Overlay = {
  name: 'None',
  type: '',
  id: 'none',
};

export const SITE_METRIC_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  health: {name: 'Health', type: 'health', id: 'health'},
  polarity: {name: 'Polarity', type: 'polarity', id: 'polarity'},
};

export const SITE_TEST_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  health: {
    name: 'Health',
    type: 'health',
    id: 'health',
    range: [0, 1, 2, 3, 4],
    bounds: [0, 4],
    colorRange: NETWORK_TEST_HEALTH_COLOR_RANGE,
    formatText: (_link, health: $Values<typeof HEALTH_CODES>) => {
      const healthDef = HEALTH_DEFS[health];
      if (!healthDef) {
        return 'Unknown';
      }
      return healthDef.name;
    },
  },
  iperf_avg_throughput: {
    name: 'Iperf throughput',
    type: 'metric',
    id: 'iperf_avg_throughput',
    //TODO: make these dynamic based on test execution id
    range: [300, 225, 120, 0],
    bounds: [0, 300],
    aggregate: (metricData: any) => {
      if (!metricData) {
        return 0;
      }
      return numToMegabits(metricData.iperf_avg_throughput || 0);
    },
    formatText: (_link, value: number) => {
      return formatNumber(value, 1);
    },
  },
};

export const HISTORICAL_SITE_METRIC_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  node_online: {
    name: 'Node online',
    type: 'health',
    id: 'topology_node_is_online',
  },
  topology: {
    name: 'Topology Changes',
    type: 'topology',
    id: 'topology_changes',
  },
};

export const HISTORICAL_LINK_METRIC_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  link_online: {
    name: 'Online',
    type: 'metric',
    id: 'topology_link_is_online',
    overlayLegendType: 'ignition_status',
    range: [1, 0.5, 0.5, 0],
    bounds: [0, 1],
  },
  topology: {
    name: 'Topology Changes',
    type: 'topology',
    id: 'topology_changes',
  },
};

export const LINK_METRIC_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  ignition_status: {
    name: 'Ignition status',
    type: 'ignition_status',
    id: 'ignition_status',
  },
  golay_tx: {name: 'Golay (TX)', type: 'golay', id: 'golay_tx'},
  golay_rx: {name: 'Golay (RX)', type: 'golay', id: 'golay_rx'},
  control_superframe: {
    name: 'Control superframe',
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
    name: 'Tx power',
    type: 'metric',
    id: 'tx_power',
    range: [1, 5, 10, 100],
    bounds: [0, 100],
  },
  link_utilization_mbps: {
    name: 'Link utilization (Mbps)',
    type: 'metric',
    id: 'link_utilization_mbps',
    query: ({network}) => {
      const tx = createQuery('tx_bytes', {network});
      const rx = createQuery('rx_bytes', {network});
      const query = `rate(${tx}[5m]) + rate(${rx}[5m])`;
      return query;
    },
    // thresholds aren't scientific
    range: [0.1, 250, 500, 2000],
    bounds: [0, 2000],
    units: 'Mbps',
    aggregate: metricData => {
      if (metricData == null) {
        return 0;
      }
      const MB = metricData['link_utilization_mbps'];
      if (MB == null || isNaN(MB)) {
        return 0;
      }
      return (MB * 8) / 1000 / 1000;
    },
    formatText: (_link, value: number) => {
      if (value == null || isNaN(value) || value < 0) {
        return '';
      }
      return `${formatNumber(value, 1)}Mbps`;
    },
  },
  link_utilization_mcs: {
    name: 'Link utilization (MCS rate)',
    type: 'metric',
    id: 'link_utilization_mcs',
    metrics: ['mcs'],
    query: ({network}) => {
      const tx = createQuery('tx_bytes', {network});
      const rx = createQuery('rx_bytes', {network});
      const query = `rate(${tx}[5m]) + rate(${rx}[5m])`;
      return query;
    },
    range: [0.1, 1, 10, 100],
    bounds: [0, 100],
    units: '%',
    aggregate: (metricData: any) => {
      if (metricData === null) {
        return -1;
      }
      const {link_utilization_mcs, mcs} = metricData;
      const mcsCapacityBits = MCS_DATARATE_TABLE[mcs];
      const totalTrafficBps = parseFloat(link_utilization_mcs) * 8;
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

export const TEST_EXECUTION_LINK_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  health: {
    name: 'Health',
    type: 'health',
    id: 'health',
    range: [0, 1, 2, 3, 4],
    bounds: [0, 4],
    colorRange: NETWORK_TEST_HEALTH_COLOR_RANGE,
    formatText: (_link, health: $Values<typeof HEALTH_CODES>) => {
      const healthDef = HEALTH_DEFS[health];
      if (!healthDef) {
        return 'Unknown';
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
  iperf_avg_throughput: {
    name: 'Iperf throughput',
    type: 'metric',
    id: 'iperf_avg_throughput',
    //TODO: make these dynamic based on test execution id
    range: [200, 150, 80, 40],
    bounds: [0, 200],
    aggregate: (metricData: any) => {
      if (!metricData) {
        return 0;
      }
      return numToMegabits(metricData.iperf_avg_throughput || 0);
    },
    formatText: (_link, value: number) => {
      return formatNumber(value, 1);
    },
  },
};

export const AREA_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  prefix_zone: {
    name: 'Prefix zone',
    type: 'prefix_zone',
    id: 'prefix_zone',
    Component: PrefixZoneOverlay,
  },
};

export const SCAN_CONNECTIVITY_LINK_OVERLAYS: Overlays = {
  health: {
    name: 'Health',
    type: 'health',
    id: 'health',
    range: [0, 1, 2, 3, 4],
    bounds: [0, 4],
    colorRange: NETWORK_TEST_HEALTH_COLOR_RANGE,
  },
};

export const SCAN_INTERFERENCE_LINK_OVERLAYS: Overlays = {
  health: {
    name: 'Health',
    type: 'health',
    id: 'health',
    range: [0, 1, 2, 3, 4],
    bounds: [0, 4],
    colorRange: NETWORK_TEST_HEALTH_COLOR_RANGE,
  },
};

export const ScanOverlayColors = {
  health: {
    strong_interference: {color: HEALTH_DEFS[HEALTH_CODES.POOR].color},
    weak_interference: {color: HEALTH_DEFS[HEALTH_CODES.MARGINAL].color},
    no_interference: {color: HEALTH_DEFS[HEALTH_CODES.EXCELLENT].color},
    emitting_interference: {color: HEALTH_DEFS[HEALTH_CODES.GOOD].color},
  },
  ignition_status: {
    potential: {color: HEALTH_DEFS[HEALTH_CODES.MARGINAL].color},
    current: {color: TG_COLOR.GREY},
  },
};

export const NODE_OVERLAYS: Overlays = {
  [OVERLAY_NONE.id]: OVERLAY_NONE,
  bearing: {
    name: 'Bearing',
    type: '',
    id: 'bearing',
  },
  ...(isFeatureEnabled('LINK_BUDGETING_ENABLED')
    ? {
        mcs_estimate: {
          name: 'MCS estimate',
          type: '',
          id: 'mcs_estimate',
        },
      }
    : {}),
};

export const LINK_PLANNING_LEGEND = {
  metric: {
    unavailable: {color: red[500]},
    candidate: {color: purple[200]},
    proposed: {color: blue[200]},
    existing: {color: grey[100]},
  },
};
const colorRange = Object.keys(LINK_PLANNING_LEGEND.metric).map(
  statusCode => LINK_PLANNING_LEGEND.metric[statusCode].color,
);
// anp uses the status_type field on all plan topology types
const ANP_STATUS_TYPE_OVERLAY: Overlay = {
  id: 'status_type',
  name: 'Status',
  type: 'metric',
  range: [
    ANP_STATUS_TYPE.UNAVAILABLE,
    ANP_STATUS_TYPE.CANDIDATE,
    ANP_STATUS_TYPE.PROPOSED,
    ANP_STATUS_TYPE.EXISTING,
  ],
  colorRange: colorRange,
};
export const SITE_PLANNING_OVERLAYS: Overlays = {
  status_type: ANP_STATUS_TYPE_OVERLAY,
};
export const LINK_PLANNING_OVERLAYS: Overlays = {
  status_type: ANP_STATUS_TYPE_OVERLAY,
};
export const NODE_PLANNING_OVERLAYS: Overlays = {
  status_type: ANP_STATUS_TYPE_OVERLAY,
};
