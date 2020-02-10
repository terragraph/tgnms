/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import NodePolarity from '../NodePolarity';
import React from 'react';
import {TestApp, renderWithRouter} from '../../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';
import {
  mockNetworkConfig,
  mockNode,
} from '../../../../tests/data/NetworkConfig';

afterEach(cleanup);

const defaultProps = {
  ctrlVersion:
    'Facebook Terragraph Release RELEASE_M43_PRE-77-g4044506c6-ljoswiak (ljoswiak@devvm1074 Tue Sep  3 22:01:21 UTC 201',
  node: mockNode({wlan_mac_addrs: ['test1', 'test2']}),
  networkConfig: mockNetworkConfig({
    topologyConfig: {polarity: {test1: true, test2: true}},
  }),
};

test('renders empty without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodePolarity {...defaultProps} node={mockNode()} />,
    </TestApp>,
  );
  expect(getByText(',')).toBeInTheDocument();
});

test('renders with props', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodePolarity {...defaultProps} />,
    </TestApp>,
  );
  expect(getByText('Polarity')).toBeInTheDocument();
  expect(getByText('test1')).toBeInTheDocument();
  expect(getByText('test2')).toBeInTheDocument();
});
