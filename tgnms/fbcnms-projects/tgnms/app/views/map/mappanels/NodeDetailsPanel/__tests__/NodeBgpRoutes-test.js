/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import NodeBgpRoutes from '../NodeBgpRoutes';
import React from 'react';
import {render} from '@testing-library/react';

const defaultProps = {
  routes: [
    {
      network: 'testNetwork',
      nextHop: 'testHop',
    },
  ],
  title: 'testTitle',
};

test('renders empty without crashing', () => {
  const {getByText} = render(<NodeBgpRoutes {...defaultProps} routes={[]} />);
  expect(getByText('testTitle')).toBeInTheDocument();
});

test('renders with routes', () => {
  const {getByText} = render(<NodeBgpRoutes {...defaultProps} />);
  expect(getByText('testTitle')).toBeInTheDocument();
  expect(getByText('testNetwork')).toBeInTheDocument();
  expect(getByText('\u2192 testHop')).toBeInTheDocument();
});
