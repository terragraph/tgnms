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
import TgMapboxNavigation from '../TgMapboxNavigation';
import {
  MapContextWrapper,
  TestApp,
  mockMapboxRef,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

function mockNavControl() {
  return {
    onAdd: () => {
      return document.createElement('div');
    },
  };
}

jest.mock('mapbox-gl', () => ({
  NavigationControl: mockNavControl,
}));

const defaultProps = {
  accessToken: 'string',
  mapRef: null,
  onSelectFeature: jest.fn(),
};
test('Renders container into mapboxControl', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByTestId} = await render(
    <TestApp>
      {/* $FlowIgnore It's a mock */}
      <MapContextWrapper contextValue={{mapboxRef}}>
        <TgMapboxNavigation {...defaultProps} />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByTestId('tg-nav-container')).toBeInTheDocument();
});

test('Renders search in container ', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByTestId} = await render(
    <TestApp>
      {/* $FlowIgnore It's a mock */}
      <MapContextWrapper contextValue={{mapboxRef}}>
        <TgMapboxNavigation {...defaultProps} />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByTestId('mapbox-search-bar')).toBeInTheDocument();
});
