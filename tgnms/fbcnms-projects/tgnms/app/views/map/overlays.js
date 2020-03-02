/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';
import {
  HISTORICAL_LINK_METRIC_OVERLAYS,
  HISTORICAL_SITE_METRIC_OVERLAYS,
  INTERVAL_SEC,
  LINK_METRIC_OVERLAYS,
  LinkOverlayColors,
  MINUTES_IN_DAY,
  SITE_METRIC_OVERLAYS,
  STEP_SIZE,
  SiteOverlayColors,
  TEST_EXECUTION_LINK_OVERLAYS,
} from '../../constants/LayerConstants';
import {createQuery, queryDataArray} from '../../apiutils/PrometheusAPIUtil';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

import type {Overlay, OverlaysConfig} from './NetworkMapTypes';
import type {
  PrometheusDataType,
  PrometheusValue,
} from '../../apiutils/PrometheusAPIUtil';

type Query = {|
  networkName: string,
  overlayId: string,
|};

type HistoricalQuery = {|
  networkName: string,
  overlayId: string,
  date: Date,
  selectedTime: Date,
  siteToNodesMap: {[string]: Set<string>},
|};

type HistoricalDataType = {
  linkOverlayData: {[string]: {}},
  siteMapOverrides: ?{[string]: string},
};

type OverlayQuery = Query | HistoricalQuery;

export interface OverlayStrategy {
  getOverlaysConfig: () => OverlaysConfig;
  changeOverlayRange: (id: string, newRange: Array<number>) => void;
  getOverlay: (id: string) => Overlay;
  getData: (query: OverlayQuery) => Promise<HistoricalDataType>;
  getDefaultOverlays: () => any;
}

// Historical metrics of the network
export class HistoricalMetricsOverlayStrategy implements OverlayStrategy {
  /** internal data structures*/
  linkOverlayList = [
    ...objectValuesTypesafe<Overlay>(HISTORICAL_LINK_METRIC_OVERLAYS),
    ...objectValuesTypesafe<Overlay>(LINK_METRIC_OVERLAYS).filter(
      overlay => overlay.type === 'metric',
    ),
  ];

  siteOverlayList = objectValuesTypesafe<Overlay>(
    HISTORICAL_SITE_METRIC_OVERLAYS,
  );

  overlayMap: {[string]: Overlay} = this.linkOverlayList.reduce(
    (final, overlay) => {
      final[overlay.id] = overlay;
      return final;
    },
    {},
  );

  historicalData: ?{
    [string]: Array<PrometheusDataType>,
  } = null;

  currentDate: ?Date = null;

  getHistoricalLinkOverlayMetrics(
    historicalData: ?{
      [string]: Array<PrometheusDataType>,
    },
    layerId: string,
    selectedTime: Date,
  ) {
    const overlay = this.getOverlay(layerId);
    let linkOverlayData;

    if (overlay && overlay.metrics) {
      linkOverlayData = overlay.metrics.reduce(
        (linkOverlayDataAggregator, metric) => {
          const metricData = this.formatHistoricalLinkOverlayData(
            historicalData,
            metric,
            selectedTime,
          );
          if (metricData) {
            Object.keys(metricData).forEach(linkName => {
              if (linkOverlayDataAggregator[linkName] !== undefined) {
                linkOverlayDataAggregator[linkName]['A'][metric] =
                  metricData[linkName]['A'][metric];
                linkOverlayDataAggregator[linkName]['Z'][metric] =
                  metricData[linkName]['Z'][metric];
              } else {
                linkOverlayDataAggregator[linkName] = metricData[linkName];
              }
            });
          }
          return linkOverlayDataAggregator;
        },
        {},
      );
    } else {
      linkOverlayData = this.formatHistoricalLinkOverlayData(
        historicalData,
        layerId,
        selectedTime,
      );
    }
    return linkOverlayData;
  }

  formatHistoricalLinkOverlayData(
    historicalData: ?{
      [string]: Array<PrometheusDataType>,
    },
    overlay: string,
    selectedTime: Date,
  ) {
    const timeStamp = selectedTime.getTime() / 1000;

    if (!historicalData || !historicalData[overlay]) {
      return {};
    }

    return historicalData[overlay].reduce((overlayData, data) => {
      const currentLinkName = data.metric.linkName || '';
      const currentLinkData = historicalData[overlay].filter(
        element => element.metric.linkName === currentLinkName,
      );
      if (currentLinkData.length === 2) {
        const [aDirection, zDirection] = currentLinkData;
        overlayData[currentLinkName] = {
          A: {
            [overlay]: this.findValuesByTimeStamp(aDirection.values, timeStamp),
          },
          Z: {
            [overlay]: this.findValuesByTimeStamp(zDirection.values, timeStamp),
          },
        };
      } else {
        const val = this.findValuesByTimeStamp(data.values, timeStamp);
        overlayData[currentLinkName] = {
          A: {[overlay]: val},
          Z: {[overlay]: val},
        };
      }
      return overlayData;
    }, {});
  }

  getHistoricalSiteMap(
    historicalData: ?{
      [string]: Array<PrometheusDataType>,
    },
    siteToNodesMap: {[string]: Set<string>},
    selectedTime: Date,
  ) {
    const timeStamp = selectedTime.getTime() / 1000;

    return Object.keys(siteToNodesMap).reduce((final, siteName) => {
      const siteNodes = [...siteToNodesMap[siteName]];
      const nodeData = historicalData?.node_online;
      if (siteNodes.length === 0 || !nodeData) {
        final[siteName] = SiteOverlayColors.health.planned.color;
      } else {
        const siteAlive = new Set(
          siteNodes.map(nodeName =>
            this.findValuesByTimeStamp(
              nodeData.find(data => data.metric.nodeName === nodeName)?.values,
              timeStamp,
            ),
          ),
        );
        if (siteAlive.has('1') && !siteAlive.has('0') && !siteAlive.has(null)) {
          final[siteName] = SiteOverlayColors.health.healthy.color;
        } else if (
          siteAlive.has('1') &&
          (siteAlive.has('0') || siteAlive.has(null))
        ) {
          final[siteName] = SiteOverlayColors.health.partial.color;
        } else if (siteAlive.has('0')) {
          final[siteName] = SiteOverlayColors.health.unhealthy.color;
        } else {
          final[siteName] = SiteOverlayColors.health.planned.color;
        }
      }
      return final;
    }, {});
  }

  findValuesByTimeStamp(data: ?PrometheusValue, timeStamp: number) {
    if (!data) {
      return null;
    }
    return data.reduce((final, [time, value]) => {
      if (time === timeStamp) {
        final = value;
      }
      return final;
    }, undefined);
  }

  formatHistoricalData = (
    selectedTime: Date,
    siteToNodesMap: {},
    overlayId: string,
  ) => {
    return {
      linkOverlayData: this.getHistoricalLinkOverlayMetrics(
        this.historicalData,
        overlayId,
        selectedTime,
      ),
      siteMapOverrides: this.getHistoricalSiteMap(
        this.historicalData,
        siteToNodesMap,
        selectedTime,
      ),
    };
  };

  getData = (query: OverlayQuery) => {
    if (!query.date) {
      return Promise.resolve({});
    }
    const {networkName, overlayId, date, selectedTime, siteToNodesMap} = query;

    if (this.historicalData && date === this.currentDate) {
      return Promise.resolve(
        this.formatHistoricalData(selectedTime, siteToNodesMap, overlayId),
      );
    }
    this.currentDate = date;
    const overlays = [...this.linkOverlayList, ...this.siteOverlayList];
    const start = Math.round(date.getTime() / 1000);
    const end = Math.round(start + MINUTES_IN_DAY * 60);
    const prometheusIds = [
      ...overlays.reduce((final, overlay) => {
        if (Array.isArray(overlay.metrics)) {
          overlay.metrics.forEach(metric => final.add(metric));
        }
        final.add(overlay.id);
        return final;
      }, new Set()),
    ];

    const queries = prometheusIds.map(prometheusId =>
      createQuery(prometheusId, {
        topologyName: networkName,
        intervalSec: INTERVAL_SEC,
      }),
    );
    return queryDataArray(queries, start, end, STEP_SIZE, networkName).then(
      response => {
        this.historicalData = response.data;
        return this.formatHistoricalData(
          selectedTime,
          siteToNodesMap,
          overlayId,
        );
      },
    );
  };

  /** public api */
  changeOverlayRange = (
    id: $Keys<typeof LINK_METRIC_OVERLAYS>,
    newRange: Array<number>,
  ) => {
    if (this.overlayMap[id]) {
      this.overlayMap[id]['range'] = newRange;
    }
  };

  getDefaultOverlays = () => ({
    link_lines: 'link_online',
    site_icons: 'node_online',
  });

  getOverlay = (id: $Keys<typeof LINK_METRIC_OVERLAYS>) => this.overlayMap[id];

  getOverlaysConfig = () => {
    return {
      link_lines: {
        layerId: 'link_lines',
        overlays: this.linkOverlayList,
        changeOverlayRange: this.changeOverlayRange,
        legend: LinkOverlayColors,
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: this.siteOverlayList,
        legend: SiteOverlayColors,
      },
    };
  };
}

// Realtime metrics of the running network
export class MetricsOverlayStrategy implements OverlayStrategy {
  /** internal data structures*/
  linkOverlayMap: {[string]: Overlay} = LINK_METRIC_OVERLAYS;
  linkOverlayList = objectValuesTypesafe<Overlay>(LINK_METRIC_OVERLAYS);
  siteOverlayList = objectValuesTypesafe<Overlay>(SITE_METRIC_OVERLAYS);

  /** public api */
  changeOverlayRange = (
    id: $Keys<typeof LINK_METRIC_OVERLAYS>,
    newRange: Array<number>,
  ) => {
    if (this.linkOverlayMap[id]) {
      this.linkOverlayMap[id]['range'] = newRange;
    }
  };

  getDefaultOverlays = () => ({
    link_lines: 'ignition_status',
    site_icons: 'health',
  });

  getOverlay = (id: $Keys<typeof LINK_METRIC_OVERLAYS>) =>
    this.linkOverlayMap[id];

  getData = (query: OverlayQuery) => {
    // link config for the metric (type, id, range, etc)
    if (!query.overlayId) {
      return Promise.resolve({});
    }
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
      .then(response => ({
        linkOverlayData: response.data,
        siteMapOverrides: null,
      }));
  };

  getOverlaysConfig = () => {
    return {
      link_lines: {
        layerId: 'link_lines',
        overlays: this.linkOverlayList,
        changeOverlayRange: this.changeOverlayRange,
        legend: LinkOverlayColors,
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: this.siteOverlayList,
        legend: SiteOverlayColors,
      },
    };
  };
}

// Results of a network test
export class TestExecutionOverlayStrategy implements OverlayStrategy {
  constructor({testId}: {testId: string}) {
    this.testId = testId;
  }

  testId: string;

  linkOverlayMap: {[string]: Overlay} = TEST_EXECUTION_LINK_OVERLAYS;
  linkOverlayList = objectValuesTypesafe<Overlay>(TEST_EXECUTION_LINK_OVERLAYS);
  siteOverlayList = objectValuesTypesafe<Overlay>(SITE_METRIC_OVERLAYS);

  changeOverlayRange = (
    id: $Keys<typeof LINK_METRIC_OVERLAYS>,
    newRange: Array<number>,
  ) => {
    if (this.linkOverlayMap[id]) {
      this.linkOverlayMap[id]['range'] = newRange;
    }
  };

  getOverlay = (id: $Keys<typeof TEST_EXECUTION_LINK_OVERLAYS>) =>
    this.linkOverlayMap[id];

  getDefaultOverlays = () => ({
    link_lines: 'health',
    site_icons: 'health',
  });

  getData = (query: OverlayQuery) => {
    if (!query.overlayId) {
      return Promise.resolve({});
    }
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
      .then(response => ({
        linkOverlayData: response.data,
        siteMapOverrides: null,
      }));
  };

  getOverlaysConfig = () => {
    return {
      link_lines: {
        layerId: 'link_lines',
        overlays: this.linkOverlayList,
        changeOverlayRange: this.changeOverlayRange,
        legend: LinkOverlayColors,
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: this.siteOverlayList,
        legend: SiteOverlayColors,
      },
    };
  };
}
