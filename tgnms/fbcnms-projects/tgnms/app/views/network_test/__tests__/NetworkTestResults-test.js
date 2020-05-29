/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import MaterialTheme from '../../../MaterialTheme';
import NetworkTestResults from '../NetworkTestResults';
import React from 'react';
import {NetworkContextWrapper} from '../../../tests/testHelpers';
import {mockExecutionResult} from '../../../tests/data/NetworkTestApi';
import {mockLinkMapValue} from '../../../tests/data/NetworkContext';
import {render} from '@testing-library/react';

const defaultProps = {
  createTestUrl: jest.fn(),
  executionResults: [],
};

test('renders with with no executions', () => {
  const {getByText} = render(
    <NetworkContextWrapper>
      <MaterialTheme>
        <NetworkTestResults {...defaultProps} />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText('0 links successfully tested')).toBeInTheDocument();
  expect(getByText('0 links unsuccessfully tested')).toBeInTheDocument();
});

test('renders with with executions', () => {
  const {getByText} = render(
    <NetworkContextWrapper
      contextValue={{
        linkMap: {
          testAssetName: mockLinkMapValue(),
        },
      }}>
      <MaterialTheme>
        <NetworkTestResults
          {...defaultProps}
          executionResults={[
            {
              linkName: 'testLink',
              results: [mockExecutionResult(), mockExecutionResult()],
            },
            {
              linkName: 'testLink2',
              results: [mockExecutionResult(), mockExecutionResult()],
            },
          ]}
        />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText('2 links successfully tested')).toBeInTheDocument();
  expect(getByText('2 Excellent health links')).toBeInTheDocument();
});
