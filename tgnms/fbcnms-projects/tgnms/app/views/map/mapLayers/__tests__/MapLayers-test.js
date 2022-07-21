/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import LinksLayer from '../LinksLayer';
import MapLayers from '../MapLayers';
import SitesLayer from '../SitesLayer';
import {
  FIG0,
  MapContextWrapper,
  NetworkContextWrapper,
  NmsOptionsContextWrapper,
  TestApp,
  mockFig0,
  mockNetworkMapOptions,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  HISTORICAL_LINK_METRIC_OVERLAYS,
  OVERLAY_NONE,
  TG_COLOR,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {Layer} from 'react-mapbox-gl';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  getLayerById,
  getLineByLinkName,
  getPropValue,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {mockNetworkContext} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NetworkMapOptions} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';
import type {Props} from '../MapLayers';

const sitesLayerSpy = jest.spyOn(SitesLayer, 'render');
const linksLayerSpy = jest.spyOn(LinksLayer, 'render');
const buildingsLayerSpy = jest.spyOn(require('../BuildingsLayer'), 'default');
const sitePopupsLayerSpy = jest.spyOn(require('../SitePopupsLayer'), 'default');

const {nodeMap, siteToNodesMap, siteMap} = buildTopologyMaps(mockFig0());

const commonProps: Props = {
  context: mockNetworkContext({nodeMap, siteToNodesMap, siteMap}),
  nearbyNodes: {},
  hiddenSites: new Set(),
};

test('renders with no layers selected', () => {
  render(
    <Wrapper
      mapValue={{
        selectedLayers: {
          nodes: false,
          buildings_3d: false,
          site_name_popups: false,
          alert_popups: false,
          area_polygons: false,
        },
        overlays: {
          link_lines: OVERLAY_NONE,
          site_icons: OVERLAY_NONE,
        },
      }}>
      <MapLayers {...commonProps} />
    </Wrapper>,
  );
  expect(Layer).not.toHaveBeenCalled();
  expect(sitesLayerSpy).not.toHaveBeenCalled();
  expect(linksLayerSpy).not.toHaveBeenCalled();
  expect(buildingsLayerSpy).not.toHaveBeenCalled();
  expect(sitePopupsLayerSpy).not.toHaveBeenCalled();
});

test('renders all layers if selected', () => {
  render(
    <Wrapper
      mapValue={{
        selectedLayers: {
          buildings_3d: true,
          site_name_popups: true,
          area_polygons: true,
        },
      }}>
      <MapLayers {...commonProps} />
    </Wrapper>,
  );
  expect(Layer).toHaveBeenCalled();
  expect(sitesLayerSpy).toHaveBeenCalled();
  expect(linksLayerSpy).toHaveBeenCalled();
  expect(buildingsLayerSpy).toHaveBeenCalled();
  expect(sitePopupsLayerSpy).toHaveBeenCalled();
});

test('renders with wrong linkname for linkmap', () => {
  render(
    <Wrapper
      mapValue={{
        selectedLayers: {
          buildings_3d: true,
          site_name_popups: true,
          area_polygons: true,
        },
      }}>
      <MapLayers
        {...commonProps}
        context={mockNetworkContext({
          selectedElement: {
            expanded: false,
            name: 'NotRealTestName',
            type: TOPOLOGY_ELEMENT.LINK,
          },
        })}
      />
    </Wrapper>,
  );
  expect(Layer).toHaveBeenCalled();
  expect(sitesLayerSpy).toHaveBeenCalled();
  expect(linksLayerSpy).toHaveBeenCalled();
  expect(buildingsLayerSpy).toHaveBeenCalled();
  expect(sitePopupsLayerSpy).toHaveBeenCalled();
});

test('renders historical topology if it exists', () => {
  render(
    <Wrapper
      mapValue={{
        selectedLayers: {
          buildings_3d: true,
          site_name_popups: true,
          area_polygons: true,
        },
      }}
      optionsMapVals={{
        historicalTopology: mockFig0(),
      }}
      networkContextValue={{nodeMap, siteToNodesMap, siteMap}}>
      <MapLayers {...commonProps} />
    </Wrapper>,
  );
  expect(Layer).toHaveBeenCalled();
  expect(sitesLayerSpy).toHaveBeenCalled();
  expect(linksLayerSpy).toHaveBeenCalled();
});

test('renders historical topology with correct colors based on data', () => {
  const {container} = render(
    <Wrapper
      mapValue={{
        selectedLayers: {
          buildings_3d: true,
          site_name_popups: true,
          area_polygons: true,
        },
        overlays: {
          link_lines: HISTORICAL_LINK_METRIC_OVERLAYS.topology,
          site_icons: OVERLAY_NONE,
          nodes: OVERLAY_NONE,
        },
        overlayData: {
          link_lines: {
            [FIG0.LINK1]: {
              A: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 0},
              Z: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 0},
            },
            [FIG0.LINK2]: {
              A: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 1},
              Z: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 1},
            },
            [FIG0.LINK3]: {
              A: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 2},
              Z: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 2},
            },
            [FIG0.LINK4]: {
              A: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 3},
              Z: {[HISTORICAL_LINK_METRIC_OVERLAYS.topology.id]: 3},
            },
          },
          site_icons: {},
          nodes: {},
        },
      }}
      optionsMapVals={{
        historicalTopology: mockFig0(),
      }}
      networkContextValue={{nodeMap, siteToNodesMap, siteMap}}>
      <MapLayers {...commonProps} />
    </Wrapper>,
  );
  const layer = getLayerById(container, 'link-normal');
  const link1 = getLineByLinkName(layer, FIG0.LINK1)[0];
  const link2 = getLineByLinkName(layer, FIG0.LINK2)[0];
  const link3 = getLineByLinkName(layer, FIG0.LINK3)[0];
  const link4 = getLineByLinkName(layer, FIG0.LINK4)[0];
  expect(link1).not.toBeNull();
  expect(link2).not.toBeNull();
  expect(link3).not.toBeNull();
  expect(link4).not.toBeNull();
  const link1Props = getPropValue(link1, 'properties');
  const link2Props = getPropValue(link2, 'properties');
  const link3Props = getPropValue(link3, 'properties');
  const link4Props = getPropValue(link4, 'properties');
  expect(link1Props?.linkColor).toBe(TG_COLOR.GREEN);
  expect(link2Props?.linkColor).toBe(TG_COLOR.ORANGE);
  expect(link3Props?.linkColor).toBe(TG_COLOR.RED);
  expect(link4Props?.linkColor).toBe(TG_COLOR.GREY);
});

function Wrapper({
  children,
  mapValue,
  optionsMapVals,
  networkContextValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
  optionsMapVals?: $Shape<NetworkMapOptions>,
  networkContextValue?: $Shape<NetworkContextType>,
}) {
  const topology = mockTopology();
  topology.__test.addSite({
    name: 'site1',
    location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
  });

  return (
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkName: 'testNetworkName',
          siteMap: {
            site1: {
              name: 'site1',
              location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
            },
          },
          networkConfig: mockNetworkConfig({topology}),
          ...networkContextValue,
        }}>
        <NmsOptionsContextWrapper
          contextValue={{
            networkMapOptions: mockNetworkMapOptions(optionsMapVals),
          }}>
          <MapContextWrapper contextValue={mapValue}>
            {children}
          </MapContextWrapper>
        </NmsOptionsContextWrapper>
      </NetworkContextWrapper>
    </TestApp>
  );
}
