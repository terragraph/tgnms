/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import LoadingBox from '../LoadingBox';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders without text', () => {
  const {getByTestId} = render(<LoadingBox />);
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders with text', () => {
  const {getByText} = render(<LoadingBox text="testing text" />);
  expect(getByText('testing text')).toBeInTheDocument();
});
