/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import Troubleshooting, {TROUBLESHOOTING_TABS} from '../Troubleshooting';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

beforeEach(() => {
  cleanup();
});

test('renders table', () => {
  const {getByText} = render(
    <TestApp>
      <Troubleshooting />
    </TestApp>,
  );

  expect(getByText(TROUBLESHOOTING_TABS.auditLog)).toBeInTheDocument();
});
