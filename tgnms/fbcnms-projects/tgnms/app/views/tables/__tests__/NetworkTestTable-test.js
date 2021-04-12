/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkTestTable from '../NetworkTestTable';
import React from 'react';
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
        <Route path="/" render={r => <NetworkTestTable {...r} />} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('Schedule Network Test')).toBeInTheDocument();
});
