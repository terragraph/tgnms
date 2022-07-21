/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
