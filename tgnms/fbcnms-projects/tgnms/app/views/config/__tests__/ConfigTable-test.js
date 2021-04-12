/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ConfigTable from '../ConfigTable';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

const defaultProps = {
  hideDeprecatedFields: true,
};

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
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
