/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';
import {HEALTH_DEFS} from '../../constants/HealthConstants';
import {MCS_DATARATE_TABLE} from '../../constants/NetworkConstants';
import {NETWORK_TEST_HEALTH_COLOR_RANGE} from '../../constants/LayerConstants';
import {formatNumber} from '../../helpers/StringHelpers';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

import type {PrometheusDataType} from '../../apiutils/PrometheusAPIUtil';

const MEGABITS = Math.pow(1000, 2);
export type OverlayQuery = {
  networkName: string,
  overlayId: string,
};

export type Overlay = {|
  name: string,
  type: string,
  id: string,
  metrics?: Array<string>,
  range?: Array<number>,
  colorRange?: Array<string>,
  units?: string,
  bounds?: Array<number>,
  overlayLegendType?: string,
  aggregate?: any => number,
  formatText?: (link: any, value: any) => string,
|};

export interface OverlayStrategy<T> {
  getOverlays: () => Array<Overlay>;
  changeOverlayRange: (id: string, newRange: Array<number>) => void;
  getOverlay: (id: string) => Overlay;
  getData: (query: OverlayQuery) => Promise<T>;
  getDefaultOverlays: () => any;
}

export type ChangeOverlayRange = {
  (id: string, newRange: Array<number>): void,
};

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

export const HISTORICAL_LINK_METRIC_OVERLAYS: {[string]: Overlay} = {
  link_online: {
    name: 'Online',
    type: 'metric',
    id: 'link_online',
    overlayLegendType: 'ignition_status',
    range: [1, 0.5, 0.5, 0],
    bounds: [0, 1],
  },
  node_online: {
    name: 'node_online',
    type: 'metric',
    id: 'node_online',
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

// Historical metrics of the network
export class HistoricalLinkMetricsOverlayStrategy
  implements OverlayStrategy<{[string]: Array<PrometheusDataType>}> {
  /** internal data structures*/
  overlayList = [
    ...objectValuesTypesafe<Overlay>(HISTORICAL_LINK_METRIC_OVERLAYS),
    ...objectValuesTypesafe<Overlay>(LINK_METRIC_OVERLAYS).filter(
      overlay => overlay.type === 'metric',
    ),
  ];

  overlayMap: {[string]: Overlay} = this.overlayList.reduce(
    (final, overlay) => {
      final[overlay.id] = overlay;
      return final;
    },
    {},
  );

  /** public api */
  getOverlays = () => this.overlayList;

  changeOverlayRange = (
    id: $Keys<typeof LINK_METRIC_OVERLAYS>,
    newRange: Array<number>,
  ) => {
    if (this.overlayMap[id]) {
      this.overlayMap[id]['range'] = newRange;
    }
  };
  getDefaultOverlays = () => {};
  getData = () => Promise.resolve({});

  getOverlay = (id: $Keys<typeof LINK_METRIC_OVERLAYS>) => this.overlayMap[id];
}

// Realtime metrics of the running network
export class LinkMetricsOverlayStrategy
  implements OverlayStrategy<{[string]: {}}> {
  /** internal data structures*/
  overlayMap: {[string]: Overlay} = LINK_METRIC_OVERLAYS;
  overlayList = objectValuesTypesafe<Overlay>(LINK_METRIC_OVERLAYS);

  /** public api */
  getOverlays = () => this.overlayList;

  changeOverlayRange = (
    id: $Keys<typeof LINK_METRIC_OVERLAYS>,
    newRange: Array<number>,
  ) => {
    if (this.overlayMap[id]) {
      this.overlayMap[id]['range'] = newRange;
    }
  };

  getDefaultOverlays = () => ({
    link_lines: 'ignition_status',
    site_icons: 'health',
  });

  getOverlay = (id: $Keys<typeof LINK_METRIC_OVERLAYS>) => this.overlayMap[id];

  getData = (query: OverlayQuery) => {
    // link config for the metric (type, id, range, etc)
    const overlayDef = this.getOverlay(query.overlayId);
    if (!overlayDef) {
      return Promise.resolve({});
    }
    const metricNames = Array.isArray(overlayDef.metrics)
      ? overlayDef.metrics.join(',')
      : overlayDef.id;

    //TODO: share flow types with backend here
    return axios
      .get<{}, {}>(
        `/metrics/overlay/linkStat/${query.networkName}/${metricNames}`,
      )
      .then(response => response.data);
  };
}

export const TEST_EXECUTION_OVERLAYS: {[string]: Overlay} = {
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

// Results of a network test
export class TestExecutionOverlayStrategy
  implements OverlayStrategy<{[string]: {}}> {
  constructor({testId}: {testId: string}) {
    this.testId = testId;
  }

  testId: string;

  overlayMap: {[string]: Overlay} = TEST_EXECUTION_OVERLAYS;

  overlayList = ((Object.values(TEST_EXECUTION_OVERLAYS): any): Array<Overlay>);

  getOverlays = () => this.overlayList;

  changeOverlayRange = (
    id: $Keys<typeof LINK_METRIC_OVERLAYS>,
    newRange: Array<number>,
  ) => {
    if (this.overlayMap[id]) {
      this.overlayMap[id]['range'] = newRange;
    }
  };

  getOverlay = (id: $Keys<typeof TEST_EXECUTION_OVERLAYS>) =>
    this.overlayMap[id];

  getDefaultOverlays = () => ({
    link_lines: 'health',
    site_icons: 'health',
  });

  getData = (query: OverlayQuery) => {
    const overlayDef = this.getOverlay(query.overlayId);
    if (!overlayDef) {
      return Promise.resolve({});
    }
    const metrics = Array.isArray(overlayDef.metrics)
      ? overlayDef.metrics
      : [overlayDef.id];

    const testId = this.testId;
    return axios
      .post(`/network_test/executions/${testId}/overlay`, {
        metrics,
      })
      .then(response => response.data);
  };
}
