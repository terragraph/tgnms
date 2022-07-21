/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import NetworkTestResults from '../NetworkTestResults';
import React from 'react';
import {NetworkContextWrapper} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {mockExecutionResult} from '@fbcnms/tg-nms/app/tests/data/NetworkTestApi';
import {mockLinkMapValue} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

const defaultProps = {
  executionResults: [],
  assetType: TOPOLOGY_ELEMENT.LINK,
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
