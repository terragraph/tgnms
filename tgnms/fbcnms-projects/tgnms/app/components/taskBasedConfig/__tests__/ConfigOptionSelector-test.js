/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ConfigOptionSelector from '../ConfigOptionSelector';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockConfigTaskContextValue} from '../../../tests/data/NetworkConfig';

afterEach(cleanup);

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
  .spyOn(require('../../../contexts/ConfigTaskContext'), 'useConfigTaskContext')
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
