/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import {formatNumber} from '../../helpers/StringHelpers';
import {MCS_DATARATE_TABLE} from '../../constants/NetworkConstants';
import {NETWORK_TEST_HEALTH_COLOR_RANGE} from '../../constants/LayerConstants';
import axios from 'axios';

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
  aggregate?: any => number,
  formatText?: (link: any, value: any) => string,
|};

export interface OverlayStrategy {
  getOverlays: () => Array<Overlay>;
  changeOverlayRange: (id: string, newRange: Array<number>) => void;
  getOverlay: (id: string) => Overlay;
  getData: (query: OverlayQuery) => Promise<any>;
}

const LINK_METRIC_OVERLAYS: {[string]: Overlay} = {
  //{name: 'Performance Health', id: 'perf_health'},
  //{name: 'Availability', id: 'availability'},
  //{name: 'Uptime', id: 'uptime'},
  health: {name: 'Health', type: 'health', id: 'health'},
  golay_tx: {name: 'Golay (TX)', type: 'golay', id: 'golay_tx'},
  golay_rx: {name: 'Golay (RX)', type: 'golay', id: 'golay_rx'},
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
  link_utilization: {
    name: 'Link Utilization',
    type: 'metric',
    id: 'link_utilization',
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
      return (8 * (rx_bytes + tx_bytes) * 100) / mcsCapacityBits;
    },
    formatText: (_link, value: number) => {
      return value >= 0 ? `${formatNumber(value, 1)}%` : '';
    },
  },
};

// Realtime metrics of the running network
export class LinkMetricsOverlayStrategy implements OverlayStrategy {
  /** internal data structures*/
  overlayMap: {[string]: Overlay} = LINK_METRIC_OVERLAYS;
  overlayList = ((Object.values(LINK_METRIC_OVERLAYS): any): Array<Overlay>);

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

  getOverlay = (id: $Keys<typeof LINK_METRIC_OVERLAYS>) => this.overlayMap[id];

  getData = (query: OverlayQuery) => {
    // link config for the metric (type, id, range, etc)
    const overlayDef = this.getOverlay(query.overlayId);
    if (!overlayDef) {
      return Promise.resolve([]);
    }

    const metrics = Array.isArray(overlayDef.metrics)
      ? overlayDef.metrics
      : [overlayDef.id];

    //TODO: share flow types with backend here
    return axios
      .post<{}, {}>(`/metrics/overlay/linkStat/${query.networkName}`, {
        metrics,
      })
      .then(response => response.data);
  };
}

const TEST_EXECUTION_OVERLAYS: {[string]: Overlay} = {
  health: {
    name: 'Health',
    type: 'metric',
    id: 'health',
    range: [0, 1, 2, 3, 4],
    bounds: [0, 4],
    colorRange: NETWORK_TEST_HEALTH_COLOR_RANGE,
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
export class TestExecutionOverlayStrategy implements OverlayStrategy {
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

  getData = (query: OverlayQuery) => {
    const overlayDef = this.getOverlay(query.overlayId);
    if (!overlayDef) {
      return Promise.resolve([]);
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
