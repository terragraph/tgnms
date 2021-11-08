/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NodeForm from '../NodeForm';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {mockTopologyBuilderContext} from '@fbcnms/tg-nms/app/tests/testHelpers';

const defaultProps = {
  index: 0,
};

jest.mock('@fbcnms/tg-nms/app/contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
    networkConfig: mockNetworkConfig(),
  }),
}));

const mockUpdateTopology = jest.fn();
const mockUseTopologyBuilderContext = jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/TopologyBuilderContext'),
    'useTopologyBuilderContext',
  )
  .mockReturnValue(
    mockTopologyBuilderContext({updateTopology: mockUpdateTopology}),
  );

test('render without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NodeForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Node Name')).toBeInTheDocument();
});

test('when form values are selected, update is called correctly', () => {
  const {getByTestId} = render(
    <TestApp>
      <NodeForm {...defaultProps} />
    </TestApp>,
  );
  act(() => {
    fireEvent.change(getByTestId('node-name-input').children[1].children[0], {
      target: {value: 'newName'},
    });
  });
  expect(mockUpdateTopology).toHaveBeenCalledWith({
    nodes: [
      {
        mac_addr: '',
        name: 'newName',
        nodeType: {
          label: 'DN',
          node_type: 2,
          pop_node: false,
        },
        node_type: 2,
        pop_node: false,
        site_name: 'testSite',
        wlan_mac_addrs: [],
      },
    ],
  });
});

test('when no form values are selected, no update is called', () => {
  mockUseTopologyBuilderContext.mockImplementation(() =>
    mockTopologyBuilderContext({
      updateTopology: mockUpdateTopology,
      selectedTopologyPanel: null,
    }),
  );
  const {getByTestId} = render(
    <TestApp>
      <NodeForm {...defaultProps} />
    </TestApp>,
  );
  act(() => {
    fireEvent.change(getByTestId('node-name-input').children[1].children[0], {
      target: {value: 'newName'},
    });
  });
  expect(mockUpdateTopology).not.toHaveBeenCalled();
});