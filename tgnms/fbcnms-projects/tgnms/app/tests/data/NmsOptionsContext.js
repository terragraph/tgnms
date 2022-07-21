/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {defaultValue as NmsOptionsContextDefaultValue} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import type {NetworkMapOptions} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {NmsOptionsContextType} from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';

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
 *   alert_popups: false,
 *   buildings_3d: false,
 * }})
 */
export function mockNetworkMapOptions(
  overrides?: $Shape<NetworkMapOptions>,
): NetworkMapOptions {
  return {
    selectedLayers: {
      site_icons: true,
      link_lines: true,
      nodes: false,
      area_polygons: false,
      site_name_popups: false,
      alert_popups: false,
      buildings_3d: false,
    },
    selectedOverlays: {
      link_lines: 'ignition_status',
      site_icons: 'health',
    },
    historicalDate: new Date(),
    selectedTime: new Date(),
    mapMode: '',
    overlayData: {},
    ...overrides,
  };
}
