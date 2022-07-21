/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import AssetTestResultDetails from '../AssetTestResultDetails';
import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import React from 'react';
import {
  NetworkContextWrapper,
  mockNode,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockExecutionResult} from '@fbcnms/tg-nms/app/tests/data/NetworkTestApi';
import {mockLinkMapValue} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

const defaultProps = {
  results: [mockExecutionResult()],
  targetThroughput: 0,
};

test('renders with with valid selected link', () => {
  const {getByText} = render(
    <NetworkContextWrapper
      contextValue={{
        linkMap: {
          testAssetName: mockLinkMapValue(),
        },
        macToNodeMap: {
          'aa:aa:aa:aa:aa': 'testNode',
        },
        nodeMap: {
          testNode: mockNode(),
        },
      }}>
      <MaterialTheme>
        <AssetTestResultDetails {...defaultProps} />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText('EXCELLENT')).toBeInTheDocument();
  expect(getByText('Summary')).toBeInTheDocument();
  expect(getByText('Iperf Throughput')).toBeInTheDocument();
});
