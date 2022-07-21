/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import LoadingBox from '../LoadingBox';
import React from 'react';
import {render} from '@testing-library/react';

test('renders without text', () => {
  const {getByTestId} = render(<LoadingBox />);
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders with text', () => {
  const {getByText} = render(<LoadingBox text="testing text" />);
  expect(getByText('testing text')).toBeInTheDocument();
});
