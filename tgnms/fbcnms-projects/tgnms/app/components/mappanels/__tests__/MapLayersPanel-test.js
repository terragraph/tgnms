/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import MapLayersPanel from '../MapLayersPanel';
import React from 'react';
import {MapContextWrapper, TestApp} from '../../../tests/testHelpers';
import {render} from '@testing-library/react';

const commonProps = {
  mapStylesConfig: [],
  selectedMapStyle: '',
  onMapStyleSelectChange: jest.fn(),
  expanded: true,
  onPanelChange: jest.fn(),
};

const emptyOverlaysConfig = {
  link_lines: {layerId: 'link_lines', overlays: [], legend: {}},
  site_icons: {layerId: 'site_icons', overlays: [], legend: {}},
  area_polygons: {
    layerId: 'area_polygons',
    overlays: [],
    legend: {},
  },
};

test('renders ', () => {
  const {getByText} = render(
    <TestApp>
      <MapContextWrapper>
        <MapLayersPanel {...commonProps} />
      </MapContextWrapper>
    </TestApp>,
  );
  expect(getByText('Map Layers')).toBeInTheDocument();
});

describe('Layers', () => {
  test('if non-static layers have no overlay config, they are hidden', () => {
    const {getByText, queryByText} = render(
      <TestApp>
        <MapContextWrapper>
          <MapLayersPanel {...commonProps} />
        </MapContextWrapper>
      </TestApp>,
    );
    expect(getByText('Layers')).toBeInTheDocument();
    expect(queryByText('Link Lines')).not.toBeInTheDocument();
    expect(queryByText('Site Icons')).not.toBeInTheDocument();
    expect(queryByText('Areas')).not.toBeInTheDocument();
  });

  test('if non-static layers have an overlay config, they are visible', () => {
    const {getByText} = render(
      <TestApp>
        <MapContextWrapper
          contextValue={{
            overlaysConfig: emptyOverlaysConfig,
          }}>
          <MapLayersPanel {...commonProps} />
        </MapContextWrapper>
      </TestApp>,
    );
    expect(getByText('Layers')).toBeInTheDocument();
    expect(getByText('Link Lines')).toBeInTheDocument();
    expect(getByText('Site Icons')).toBeInTheDocument();
    expect(getByText('Areas')).toBeInTheDocument();
  });
});