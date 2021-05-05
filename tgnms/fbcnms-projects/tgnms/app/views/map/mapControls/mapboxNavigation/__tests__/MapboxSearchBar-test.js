/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import MapboxSearchBar from '../MapboxSearchBar';
import React from 'react';
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
  onSelectFeature: jest.fn(),
  getCustomResults: jest.fn(),
  shouldSearchPlaces: jest.fn(),
  onRenderResult: jest.fn(),
};

test('renders', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByTestId} = await render(
    <TestApp>
      <MapContextWrapper contextValue={{mapboxRef}}>
        <MapboxSearchBar {...defaultProps} />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByTestId('mapbox-search-bar')).toBeInTheDocument();
});
