/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import MapboxSearchBar from '../MapboxSearchBar';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

const defaultProps = {
  accessToken: 'testToken',
  mapRef: null,
  onSelectFeature: jest.fn(),
  getCustomResults: jest.fn(),
  shouldSearchPlaces: jest.fn(),
  onRenderResult: jest.fn(),
};

beforeEach(() => {
  cleanup();
  jest.clearAllMocks();
});

test('renders', () => {
  const {getByTestId} = render(<MapboxSearchBar {...defaultProps} />);
  expect(getByTestId('mapbox-search-bar')).toBeInTheDocument();
});
