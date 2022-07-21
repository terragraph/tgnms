/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
