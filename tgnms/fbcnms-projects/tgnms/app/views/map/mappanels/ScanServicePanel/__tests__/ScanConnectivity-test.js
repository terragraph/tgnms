/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import ScanConnectivity from '../ScanConnectivity';
import {
  NetworkContextWrapper,
  TestApp,
  mockNode,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {sendTopologyBuilderRequest as mockSendTopologyBuilderRequest} from '@fbcnms/tg-nms/app/helpers/MapPanelHelpers';

import type {ExecutionResultDataType} from '@fbcnms/tg-nms/shared/dto/ScanServiceTypes';

jest.mock('@fbcnms/tg-nms/app/helpers/MapPanelHelpers');

const defaultProps = {
  onBack: jest.fn(),
  results: [],
  startDate: new Date(),
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <ScanConnectivity {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Search')).toBeInTheDocument();
});

test('can commit connectivity link to topology', () => {
  const macToNodeMap = {
    'txnode1.mac': 'txnode1',
    'rxnode1.mac': 'rxnode1',
  };
  // Will only suggest a link if it doesn't already exist in linkMap.
  const linkMap = {};
  // Node polarities must not be the same.
  const nodeMap = {
    txnode1: mockNode({
      mac_addr: 'txnode1.mac',
      polarity: 'ODD',
    }),
    rxnode1: mockNode({
      mac_addr: 'rxnode1.mac',
      polarity: 'EVEN',
    }),
  };
  // So that polarity is based on `polarity` field.
  const networkConfig = mockNetworkConfig({controller_version: 'RELEASE_M30'});
  const props = {
    onBack: jest.fn(),
    startDate: new Date(),
    results: [
      convertType<ExecutionResultDataType>({
        tx_node: 'txnode1',
        connectivity: [
          {
            routes: [[1, 2, 16]],
            tx_node: 'txnode1.mac',
            rx_node: 'rxnode1.mac',
          },
        ],
      }),
    ],
  };
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkName: 'MyNetwork',
          networkConfig,
          macToNodeMap,
          linkMap,
          nodeMap,
        }}>
        <ScanConnectivity {...props} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  // Click on link
  act(() => {
    fireEvent.click(getByText('16'));
  });
  // Click to add to network
  act(() => {
    fireEvent.click(getByText('Add Link To MyNetwork'));
  });
  // Confirm add to network in confirmation modal
  act(() => {
    fireEvent.click(getByText('Add to Network'));
  });
  expect(mockSendTopologyBuilderRequest).toHaveBeenCalledWith(
    'MyNetwork',
    'addLink',
    {
      link: {
        a_node_mac: 'txnode1.mac',
        a_node_name: 'txnode1',
        link_type: 1,
        z_node_mac: 'rxnode1.mac',
        z_node_name: 'rxnode1',
      },
    },
    expect.anything(),
  );
});
