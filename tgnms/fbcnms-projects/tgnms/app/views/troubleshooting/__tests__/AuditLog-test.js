/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import AuditLog from '../AuditLog';
import React from 'react';
import {render} from '@testing-library/react';

test('renders table', () => {
  const {getByTestId} = render(<AuditLog />);

  expect(getByTestId('log-iframe')).toBeInTheDocument();
});
