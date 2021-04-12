/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigTaskEnabled from '../ConfigTaskEnabled';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const defaultProps = {
  label: 'testLabel',
  configField: 'test.input.override',
  enabledConfigField: 'test.overrides',
  configLevel: 'node',
};

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(mockConfigTaskContextValue());

test('renders a when enabled', () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <ConfigTaskEnabled {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testLabel')).toBeInTheDocument();
  expect(
    getByTestId('task-collapse').className.includes('MuiCollapse-entered'),
  );
});

test('hidden in dropdown when disabled', () => {
  const {getByTestId} = render(
    <TestApp>
      <ConfigTaskEnabled
        {...defaultProps}
        enabledConfigField={'test.overrides.fail'}
      />
    </TestApp>,
  );
  expect(getByTestId('task-collapse').className.includes('MuiCollapse-hidden'));
});
