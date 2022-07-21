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
import MapOverlayLegend from '../MapOverlayLegend';
import {
  MapContextWrapper,
  TestApp,
  mockMapboxRef,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

import MapboxDrawMock from '@mapbox/mapbox-gl-draw';
jest.mock('@mapbox/mapbox-gl-draw');

beforeEach(() => {
  MapboxDrawMock.mockClear();
  MapboxDrawMock.mockReset();
});

test('Renders legend container into mapboxControl', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByTestId} = await render(
    <TestApp>
      {/* $FlowIgnore It's a mock */}
      <MapContextWrapper contextValue={{mapboxRef}}>
        <MapOverlayLegend />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByTestId('tg-legend-container')).toBeInTheDocument();
});

test('Renders legend in container ', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByText} = await render(
    <TestApp>
      {/* $FlowIgnore It's a mock */}
      <MapContextWrapper contextValue={{mapboxRef}}>
        <MapOverlayLegend />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByText('Legend')).toBeInTheDocument();
});
