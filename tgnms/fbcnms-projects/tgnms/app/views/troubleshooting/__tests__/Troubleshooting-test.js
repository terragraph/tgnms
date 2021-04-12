/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import Troubleshooting, {TROUBLESHOOTING_TABS} from '../Troubleshooting';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

test('renders table', () => {
  const {getByText} = render(
    <TestApp>
      <Troubleshooting />
    </TestApp>,
  );

  expect(getByText(TROUBLESHOOTING_TABS.auditLog)).toBeInTheDocument();
});
