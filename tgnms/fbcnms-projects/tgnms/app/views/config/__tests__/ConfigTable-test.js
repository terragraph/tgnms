/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigTable from '../ConfigTable';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';

import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';
import {renderWithRouter} from '../../../tests/testHelpers';

const defaultProps = {
  hideDeprecatedFields: true,
};

jest
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
  .mockReturnValue(mockConfigTaskContextValue());

test('renders without crashing', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Field')).toBeInTheDocument();
  expect(getByText('Status')).toBeInTheDocument();
});

test('renders table rows', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Field')).toBeInTheDocument();
  expect(getByText('test.test2')).toBeInTheDocument();
  expect(getByText('unset')).toBeInTheDocument();
  expect(getByText('String')).toBeInTheDocument();
});
