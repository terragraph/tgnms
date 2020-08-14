/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import React from 'react';
import ScanTable from '../ScanTable';
import {
  NetworkContextWrapper,
  SnackbarWrapper,
  TestApp,
} from '../../../tests/testHelpers';
import {Route} from 'react-router-dom';
import {render} from '@testing-library/react';

test('renders table', () => {
  const {getByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <SnackbarWrapper>
          <Route path="/" render={r => <ScanTable {...r} />} />
        </SnackbarWrapper>
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByText('Type')).toBeInTheDocument();
  expect(getByText('Schedule Scan')).toBeInTheDocument();
});