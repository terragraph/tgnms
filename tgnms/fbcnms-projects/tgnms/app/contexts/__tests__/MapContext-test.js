/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import MapContext, {MapContextProvider, useMapContext} from '../MapContext';
import {
  LINK_METRIC_OVERLAYS,
  LinkOverlayColors,
  SITE_METRIC_OVERLAYS,
  SiteOverlayColors,
} from '../../constants/LayerConstants';
import {
  NetworkContextWrapper,
  NmsOptionsContextWrapper,
  mockNetworkMapOptions,
} from '../../tests/testHelpers';
import {Router} from 'react-router-dom';
import {act, renderHook} from '@testing-library/react-hooks';
import {createMemoryHistory} from 'history';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

import type {ProviderProps as MapContextProviderProps} from '../MapContext';
import type {NetworkContextType} from '../NetworkContext';
import type {NetworkMapOptions} from '../../views/map/NetworkMapTypes';
import type {NmsOptionsContextType} from '../NmsOptionsContext';
import type {Overlay} from '../../views/map/NetworkMapTypes';

const testOverlaysConfig = {
  link_lines: {
    layerId: 'link_lines',
    overlays: objectValuesTypesafe<Overlay>(LINK_METRIC_OVERLAYS),
    legend: LinkOverlayColors,
    defaultOverlayId: 'mcs',
  },
  site_icons: {
    layerId: 'site_icons',
    overlays: objectValuesTypesafe<Overlay>(SITE_METRIC_OVERLAYS),
    legend: SiteOverlayColors,
    defaultOverlayId: 'health',
  },
};

const allLayersSelected = {
  link_lines: true,
  site_icons: true,
  area_polygons: true,
  nodes: true,
  buildings_3d: true,
  site_name_popups: true,
  alert_popups: true,
};

describe('mapMode', () => {
  test('setMapMode changes mapMode', () => {
    const {result} = testContext(useMapContext);
    expect(result.current.mapMode).toBe('DEFAULT');
    act(() => {
      result.current.setMapMode('HISTORICAL');
    });
    expect(result.current.mapMode).toBe('HISTORICAL');
  });
});

describe('overlaysConfig', () => {
  test(
    'setOverlaysConfig changes selected overlays to defaults ' +
      'if none are selected',
    () => {
      const {result} = testContext(useMapContext, {
        wrapper: props => (
          <Wrapper {...props} optionsMapVals={{selectedOverlays: undefined}} />
        ),
      });
      // should equal defaults
      expect(result.current.overlaysConfig).toEqual({});
      expect(result.current.selectedOverlays).toEqual({});
      act(() => {
        result.current.setSelectedOverlays({});
      });
      act(() => {
        result.current.setOverlaysConfig(testOverlaysConfig);
      });
      expect(result.current.overlaysConfig).toEqual(testOverlaysConfig);
      expect(result.current.selectedOverlays).toEqual({
        link_lines: 'mcs',
        site_icons: 'health',
      });
    },
  );
});

describe('setters', () => {
  test('setSelectedLayers', () => {
    const {result} = testContext(useMapContext);
    expect(result.current.selectedLayers).toEqual({
      link_lines: true,
      site_icons: true,
      nodes: false,
      buildings_3d: false,
      site_name_popups: false,
      alert_popups: false,
      area_polygons: false,
    });
    act(() => {
      result.current.setSelectedLayers(allLayersSelected);
    });
    expect(result.current.selectedLayers).toEqual(allLayersSelected);
  });
  test('setIsLayerSelected', () => {
    const {result} = testContext(useMapContext);
    expect(result.current.selectedLayers).toEqual({
      link_lines: true,
      site_icons: true,
      nodes: false,
      area_polygons: false,
      buildings_3d: false,
      site_name_popups: false,
      alert_popups: false,
    });
    act(() => {
      result.current.setIsLayerSelected('site_icons', false);
    });
    act(() => {
      result.current.setIsLayerSelected('buildings_3d', true);
    });
    expect(result.current.selectedLayers).toEqual({
      link_lines: true,
      site_icons: false,
      nodes: false,
      area_polygons: false,
      buildings_3d: true,
      site_name_popups: false,
      alert_popups: false,
    });
  });

  test('setIsOverlayLoading', () => {
    const {result} = testContext(useMapContext);
    expect(result.current.isOverlayLoading).toBe(false);
    act(() => {
      result.current.setIsOverlayLoading(true);
    });
    expect(result.current.isOverlayLoading).toBe(true);
    act(() => {
      result.current.setIsOverlayLoading(false);
    });
    expect(result.current.isOverlayLoading).toBe(false);
  });

  test('setLayerOverlay', () => {
    const {result} = testContext(useMapContext);
    expect(result.current.selectedOverlays).toEqual({
      link_lines: 'ignition_status',
      site_icons: 'health',
    });
    act(() => {
      result.current.setLayerOverlay('link_lines', 'mcs');
    });
    act(() => {
      result.current.setLayerOverlay('site_icons', 'polarity');
    });
    expect(result.current.selectedOverlays).toEqual({
      link_lines: 'mcs',
      site_icons: 'polarity',
    });
  });
});

/**
 * The NmsOptionsContext is currently used to persist a view's state whenever
 * the user changes views. These tests are for saving/restoring the mapcontext's
 * state using the NmsOptionsContext
 */
describe('optionsContext integration', () => {
  test('MapContext correctly initializes using NmsOptionsContext', () => {
    const overlayDataMock = {
      link_lines: {},
    };
    const {result} = testContext(useMapContext, {
      wrapper: props => (
        <Wrapper
          {...props}
          optionsMapVals={{
            selectedLayers: allLayersSelected,
            selectedOverlays: {
              link_lines: 'mcs',
              site_icons: 'polarity',
            },
            overlayData: overlayDataMock,
            mapMode: 'HISTORICAL',
          }}
        />
      ),
    });
    expect(result.current.selectedLayers).toEqual(allLayersSelected);

    expect(result.current.selectedOverlays).toEqual({
      link_lines: 'mcs',
      site_icons: 'polarity',
    });
    expect(result.current.overlayData).toBe(overlayDataMock);
    expect(result.current.mapMode).toBe('HISTORICAL');
  });
  test('MapContext correctly persists state to NmsOptionsContext', () => {
    const updateMock = jest.fn();
    const {result, unmount} = testContext(useMapContext, {
      wrapper: props => (
        <Wrapper
          {...props}
          optionsVals={{updateNetworkMapOptions: updateMock}}
        />
      ),
    });
    act(() => {
      result.current.setMapMode('HISTORICAL');
    });
    act(() => {
      result.current.setSelectedOverlays({
        link_lines: 'mcs',
        site_icons: 'polarity',
      });
    });
    act(() => {
      result.current.setSelectedLayers({
        link_lines: false,
        site_icons: false,
      });
    });
    act(() => {
      unmount();
    });
    expect(updateMock).toHaveBeenLastCalledWith({
      selectedLayers: {
        link_lines: false,
        site_icons: false,
      },
      selectedOverlays: {
        link_lines: 'mcs',
        site_icons: 'polarity',
      },
      mapMode: 'HISTORICAL',
      overlayData: {},
    });
  });

  test('falls back to empty states if networkMapOptions is empty', () => {
    const {result} = testContext(useMapContext, {
      wrapper: props => (
        <Wrapper
          {...props}
          optionsVals={{networkMapOptions: ({}: $Shape<NetworkMapOptions>)}}
        />
      ),
    });
    expect(result.current.selectedLayers).toEqual({
      link_lines: true,
      site_icons: true,
      alert_popups: true,
    });
    expect(result.current.selectedOverlays).toEqual({});
  });
});
// this is only for test coverage
test('MapContext default value', () => {
  const {result} = renderHook(() => React.useContext(MapContext));
  expect(result.current.mapMode).toBe('');
  expect(result.current.selectedLayers).toEqual({});
  expect(result.current.selectedOverlays).toEqual({});
  act(() => {
    result.current.setSelectedLayers({});
  });
});

function testContext(
  hook,
  options?: {wrapper: React.ComponentType<{children: React.Node}>},
) {
  const {wrapper} = options || {wrapper: Wrapper};
  return renderHook(hook, {wrapper});
}

function Wrapper({
  children,
  optionsMapVals,
  optionsVals,
  networkVals,
  mapVals,
}: {
  children: React.Node,
  networkVals?: $Shape<NetworkContextType>,
  mapVals?: $Shape<MapContextProviderProps>,
  optionsVals?: $Shape<NmsOptionsContextType>,
  optionsMapVals?: $Shape<NetworkMapOptions>,
}) {
  return (
    <Router history={createMemoryHistory({initialEntries: ['/']})}>
      <NmsOptionsContextWrapper
        contextValue={{
          networkMapOptions: mockNetworkMapOptions(optionsMapVals),
          ...(optionsVals || {}),
        }}>
        <NetworkContextWrapper contextValue={networkVals}>
          <MapContextProvider
            {...(mapVals || {}: $Shape<MapContextProviderProps>)}>
            {children}
          </MapContextProvider>
        </NetworkContextWrapper>
      </NmsOptionsContextWrapper>
    </Router>
  );
}
