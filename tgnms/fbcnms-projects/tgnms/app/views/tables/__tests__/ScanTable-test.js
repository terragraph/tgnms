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
import ScanTable from '../ScanTable';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {Route} from 'react-router-dom';
import {render} from '@testing-library/react';

test('renders table', () => {
  const {getByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <Route path="/" render={r => <ScanTable {...r} />} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('Schedule Scan')).toBeInTheDocument();
});
