/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeBgpRoutes from '../NodeBgpRoutes';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

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
