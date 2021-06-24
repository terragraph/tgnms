/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import LinksLayer from '../LinksLayer';
import MapLayers from '../MapLayers';
import SitesLayer from '../SitesLayer';
import {Layer} from 'react-mapbox-gl';
import {
  MapContextWrapper,
  NetworkContextWrapper,
  TestApp,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {OVERLAY_NONE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {mockNetworkContext} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {Props} from '../MapLayers';

const sitesLayerSpy = jest.spyOn(SitesLayer, 'render');
const linksLayerSpy = jest.spyOn(LinksLayer, 'render');
const buildingsLayerSpy = jest.spyOn(require('../BuildingsLayer'), 'default');
const sitePopupsLayerSpy = jest.spyOn(require('../SitePopupsLayer'), 'default');

const commonProps: Props = {
  context: mockNetworkContext(),
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

function Wrapper({
  children,
  mapValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
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
        }}>
        <MapContextWrapper contextValue={mapValue}>
          {children}
        </MapContextWrapper>
      </NetworkContextWrapper>
    </TestApp>
  );
}
