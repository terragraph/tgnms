/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AssetDirectionDetails from '../AssetDirectionDetails';
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
  result: mockExecutionResult(),
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
        <AssetDirectionDetails {...defaultProps} />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText('EXCELLENT')).toBeInTheDocument();
  expect(getByText('Summary')).toBeInTheDocument();
  expect(getByText('Iperf Throughput')).toBeInTheDocument();
});
