/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {MetricsOverlayStrategy} from '../../views/map/overlays';
import {defaultValue as NmsOptionsContextDefaultValue} from '../../contexts/NmsOptionsContext';
import type {NetworkMapOptions} from '../../views/map/NetworkMapTypes';
import type {NmsOptionsContextType} from '../../contexts/NmsOptionsContext';

/**
 * Creates a fake NMS option context which passes flow validation
 * @param {object} overrides overrides default properties of the mock context
 * @example
 * mockNmsOptionsContext({networkMapOptions: mockNetworkMapOptions()})
 */
export function mockNmsOptionsContext(
  overrides?: $Shape<NmsOptionsContextType>,
): NmsOptionsContextType {
  return Object.assign(NmsOptionsContextDefaultValue, overrides || {});
}

/**
 * Creates a fake network map option which passes flow validation
 * @param {object} overrides overrides default properties of the mock
 * @example
 * mockNetworkMapOptions({selectedLayers: {
 *   site_icons: false,
 *   link_lines: false,
 *   site_name_popups: false,
 *   buildings_3d: false,
 * }})
 */
export function mockNetworkMapOptions(
  overrides?: $Shape<NetworkMapOptions>,
): NetworkMapOptions {
  const overlay = new MetricsOverlayStrategy();
  return {
    overlayStrategy: overlay,
    selectedOverlays: overlay.getDefaultOverlays(),
    selectedLayers: {
      site_icons: true,
      link_lines: true,
      site_name_popups: false,
      buildings_3d: false,
    },
    linkOverlayMetrics: {},
    historicalDate: new Date(),
    selectedTime: new Date(),
    ...overrides,
  };
}
