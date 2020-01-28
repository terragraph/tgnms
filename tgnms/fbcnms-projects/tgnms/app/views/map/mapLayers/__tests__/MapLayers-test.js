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
import {TestApp, mockOverlay, mockRoutes} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkContext} from '../../../../tests/data/NetworkContext';

import type {Props} from '../MapLayers';

const sitesLayerSpy = jest.spyOn(SitesLayer, 'render');
const linksLayerSpy = jest.spyOn(LinksLayer, 'render');
const buildingsLayerSpy = jest.spyOn(BuildingsLayer, 'render');
const sitePopupsLayerSpy = jest.spyOn(SitePopupsLayer, 'render');

afterEach(cleanup);

const commonProps: Props = {
  context: mockNetworkContext(),
  selectedLayers: {
    link_lines: false,
    site_icons: false,
    buildings_3d: false,
    site_name_popups: false,
  },
  plannedSite: null,
  nearbyNodes: {},
  routes: mockRoutes(),
  siteMapOverrides: null,
  onPlannedSiteMoved: jest.fn(),
  hiddenSites: new Set(),
  selectedOverlays: {
    link_lines: 'testLines',
    site_icons: 'testSite',
  },
  historicalOverlay: null,
  overlay: mockOverlay(),
  linkMetricData: null,
};

test('renders with no layers selected', () => {
  render(
    <TestApp>
      <MapLayers {...commonProps} />
    </TestApp>,
  );
  expect(Layer).not.toHaveBeenCalled();
  expect(sitesLayerSpy).not.toHaveBeenCalled();
  expect(linksLayerSpy).not.toHaveBeenCalled();
  expect(buildingsLayerSpy).not.toHaveBeenCalled();
  expect(sitePopupsLayerSpy).not.toHaveBeenCalled();
});

test('renders all layers if selected', () => {
  render(
    <TestApp>
      <MapLayers
        {...commonProps}
        selectedLayers={{
          link_lines: true,
          site_icons: true,
          buildings_3d: true,
          site_name_popups: true,
        }}
      />
    </TestApp>,
  );
  expect(Layer).toHaveBeenCalled();
  expect(sitesLayerSpy).toHaveBeenCalled();
  expect(linksLayerSpy).toHaveBeenCalled();
  expect(buildingsLayerSpy).toHaveBeenCalled();
  expect(sitePopupsLayerSpy).toHaveBeenCalled();
});
