/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeDetails from '../NodeDetails';
import React from 'react';
import {TestApp, renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {
  mockNetworkConfig,
  mockNetworkHealth,
  mockNode,
  mockStatusReport,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const defaultProps = {
  ctrlVersion: 'testVer',
  node: mockNode(),
  networkNodeHealth: mockNetworkHealth(),
  networkConfig: mockNetworkConfig(),
  onSelectLink: () => {},
  onSelectSite: () => {},
  topology: mockTopology(),
  statusReport: mockStatusReport(),
};

test('renders empty without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeDetails {...defaultProps} />,
    </TestApp>,
  );
  expect(getByText('Status')).toBeInTheDocument();
  expect(getByText('Node Type')).toBeInTheDocument();
  expect(getByText('Last Reported')).toBeInTheDocument();
});

test('renders hardware type if it exists in statusReport', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeDetails {...defaultProps} />,
    </TestApp>,
  );
  expect(getByText('Status')).toBeInTheDocument();
  expect(getByText('Node Type')).toBeInTheDocument();
  expect(getByText('Last Reported')).toBeInTheDocument();
});
