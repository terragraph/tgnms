/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import AuditLog from '../AuditLog';
import React from 'react';
import {cleanup, render} from '@testing-library/react';

beforeEach(() => {
  cleanup();
});

test('renders table', () => {
  const {getByTestId} = render(<AuditLog />);

  expect(getByTestId('log-iframe')).toBeInTheDocument();
});
