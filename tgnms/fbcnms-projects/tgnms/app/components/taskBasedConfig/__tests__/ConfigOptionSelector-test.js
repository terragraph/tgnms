/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ConfigOptionSelector from '../ConfigOptionSelector';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockConfigTaskContextValue} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

const defaultProps = {
  options: {
    option1: {
      name: 'testName1',
    },
    option2: {
      name: 'testName2',
    },
  },
};

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/ConfigTaskContext'),
    'useConfigTaskContext',
  )
  .mockReturnValue(mockConfigTaskContextValue());

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigOptionSelector {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testName1')).toBeInTheDocument();
});

test('checks which is selected based on configOverrides and sets it on initial render', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigOptionSelector
        options={{
          option1: {
            name: 'testName1',
            setConfigs: [],
          },
          option2: {
            name: 'testName2',
            setConfigs: [{configField: 'set.config.test', set: 'update'}],
          },
        }}
      />
    </TestApp>,
  );
  expect(getByText('testName2'));
});
