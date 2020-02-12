/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {
  HistoricalMetricsOverlayStrategy,
  MetricsOverlayStrategy,
  TestExecutionOverlayStrategy,
} from '../views/map/overlays';
import {getHistoricalDate} from '../helpers/NetworkHelpers';
import {getTestOverlayId} from '../helpers/NetworkTestHelpers';
import type {NetworkMapOptions} from '../views/map/NetworkMapTypes';

export type NmsOptionsContextType = {|
  networkMapOptions: NetworkMapOptions,
  networkTablesOptions: {},
  updateNetworkMapOptions: NetworkMapOptions => void,
  updateNetworkTableOptions: () => void,
|};

export function defaultNetworkMapOptions() {
  const testId = getTestOverlayId(location);
  const historicalDate = getHistoricalDate(location);
  let overlayStrategy;
  if (testId) {
    overlayStrategy = new TestExecutionOverlayStrategy({
      testId,
    });
  } else if (historicalDate) {
    overlayStrategy = new HistoricalMetricsOverlayStrategy();
  } else {
    overlayStrategy = new MetricsOverlayStrategy();
  }

  return {
    overlayStrategy: overlayStrategy,
    selectedOverlays: overlayStrategy.getDefaultOverlays(),
    selectedLayers: {
      site_icons: true,
      link_lines: true,
      site_name_popups: false,
      buildings_3d: false,
    },
    linkOverlayMetrics: {},
    historicalDate: historicalDate
      ? new Date(historicalDate)
      : new Date(new Date().toISOString().split('T')[0] + 'T08:00:00Z'),
    selectedTime: new Date(),
  };
}

export const defaultValue = {
  networkMapOptions: {},
  networkTablesOptions: {},
  updateNetworkMapOptions: () => {},
  updateNetworkTableOptions: () => {},
};

// store topology data
const NmsOptionsContext = React.createContext<NmsOptionsContextType>(
  defaultValue,
);

export default NmsOptionsContext;
