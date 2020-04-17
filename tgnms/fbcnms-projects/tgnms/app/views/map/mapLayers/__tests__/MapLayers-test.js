/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import BuildingsLayer from '../BuildingsLayer';
import LinksLayer from '../LinksLayer';
import MapLayers from '../MapLayers';
import SitePopupsLayer from '../SitePopupsLayer';
import SitesLayer from '../SitesLayer';
import {Layer} from 'react-mapbox-gl';
import {
  MapContextWrapper,
  TestApp,
  mockRoutes,
} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkContext} from '../../../../tests/data/NetworkContext';

import type {MapContext} from '../../../../contexts/MapContext';
import type {Props} from '../MapLayers';

const sitesLayerSpy = jest.spyOn(SitesLayer, 'render');
const linksLayerSpy = jest.spyOn(LinksLayer, 'render');
const buildingsLayerSpy = jest.spyOn(BuildingsLayer, 'render');
const sitePopupsLayerSpy = jest.spyOn(SitePopupsLayer, 'render');

afterEach(cleanup);

const commonProps: Props = {
  context: mockNetworkContext(),
  plannedSite: null,
  nearbyNodes: {},
  routes: mockRoutes(),
  onPlannedSiteMoved: jest.fn(),
  hiddenSites: new Set(),
};

test('renders with no layers selected', () => {
  render(
    <Wrapper
      mapValue={{
        selectedLayers: {
          link_lines: false,
          site_icons: false,
          buildings_3d: false,
          site_name_popups: false,
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

function Wrapper({
  children,
  mapValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
}) {
  return (
    <TestApp>
      <MapContextWrapper contextValue={mapValue}>{children}</MapContextWrapper>
    </TestApp>
  );
}
