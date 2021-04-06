/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkTestPanel from '../NetworkTestPanel';
import React from 'react';
import {TestApp, renderWithRouter} from '../../../../tests/testHelpers';

const defaultProps = {
  expanded: true,
  testId: null,
};

test('doest not render table if there is no test ID', () => {
  const {queryByText} = renderWithRouter(
    <NetworkTestPanel {...defaultProps} />,
  );
  expect(queryByText('Network Test')).not.toBeInTheDocument();
});

test('renders table if there is a test ID', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkTestPanel {...defaultProps} testId={'1'} />
    </TestApp>,
  );
  expect(getByText('Network Test')).toBeInTheDocument();
});
