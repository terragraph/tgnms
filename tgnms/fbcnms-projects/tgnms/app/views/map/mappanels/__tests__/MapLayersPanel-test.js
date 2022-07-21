/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import MapLayersPanel from '../MapLayersPanel';
import React from 'react';
import {MapContextWrapper, TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
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
    expect(queryByText('Links')).not.toBeInTheDocument();
    expect(queryByText('Sites')).not.toBeInTheDocument();
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
    expect(getByText('3D Buildings')).toBeInTheDocument();
    expect(getByText('Site Names')).toBeInTheDocument();
  });
});
