/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
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
} from '../../../../tests/testHelpers';
import {TopologyElementType} from '../../../../constants/NetworkConstants';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkConfig} from '../../../../tests/data/NetworkConfig';
import {mockNetworkContext} from '../../../../tests/data/NetworkContext';

import type {MapContext} from '../../../../contexts/MapContext';
import type {Props} from '../MapLayers';

const sitesLayerSpy = jest.spyOn(SitesLayer, 'render');
const linksLayerSpy = jest.spyOn(LinksLayer, 'render');
const buildingsLayerSpy = jest.spyOn(require('../BuildingsLayer'), 'default');
const sitePopupsLayerSpy = jest.spyOn(require('../SitePopupsLayer'), 'default');

afterEach(cleanup);

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
          link_lines: false,
          site_icons: false,
          nodes: false,
          buildings_3d: false,
          site_name_popups: false,
          alert_popups: false,
          area_polygons: false,
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
          link_lines: true,
          site_icons: true,
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
          link_lines: true,
          site_icons: true,
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
            type: TopologyElementType.LINK,
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
