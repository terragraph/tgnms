/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import NetworkTestResults from '../NetworkTestResults';
import React from 'react';
import {NetworkContextWrapper} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TopologyElementType} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {mockExecutionResult} from '@fbcnms/tg-nms/app/tests/data/NetworkTestApi';
import {mockLinkMapValue} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

const defaultProps = {
  executionResults: [],
  assetType: TopologyElementType.LINK,
};

test('renders with with no executions', () => {
  const {getByText} = render(
    <NetworkContextWrapper>
      <MaterialTheme>
        <NetworkTestResults {...defaultProps} />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText(/0 links successfully tested/i)).toBeInTheDocument();
  expect(getByText(/0 links unsuccessfully tested/i)).toBeInTheDocument();
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
              assetName: 'testLink',
              results: [mockExecutionResult(), mockExecutionResult()],
            },
            {
              assetName: 'testLink2',
              results: [mockExecutionResult(), mockExecutionResult()],
            },
          ]}
        />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText(/2 links successfully tested/i)).toBeInTheDocument();
  expect(getByText(/2 links with excellent health/i)).toBeInTheDocument();
});
