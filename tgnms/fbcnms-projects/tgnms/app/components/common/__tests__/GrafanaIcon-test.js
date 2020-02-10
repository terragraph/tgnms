/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import GrafanaIcon from '../GrafanaIcon';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders', () => {
  const {getByTestId} = render(<GrafanaIcon />);
  expect(getByTestId('grafana-icon')).toBeInTheDocument();
});
