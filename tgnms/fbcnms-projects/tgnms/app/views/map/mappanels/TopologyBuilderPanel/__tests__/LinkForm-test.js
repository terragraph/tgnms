/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import LinkForm from '../LinkForm';
import {
  TestApp,
  mockFig0,
  mockNode,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const defaultProps = {
  index: 0,
};

jest.mock('@fbcnms/tg-nms/app/contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
    nodeMap: {
      'site1-0': mockNode(),
    },
    networkConfig: mockNetworkConfig({
      topology: mockFig0(),
    }),
  }),
}));

const mockUpdateTopology = jest.fn();
jest.mock('@fbcnms/tg-nms/app/contexts/TopologyBuilderContext', () => ({
  useTopologyBuilderContext: () => ({
    elementType: 'link',
    updateTopology: mockUpdateTopology,
    newTopology: {nodes: [{name: 'site1-0'}], links: []},
    initialParams: {},
  }),
}));

test('render without crashing', () => {
  const {getByLabelText} = render(
    <TestApp>
      <LinkForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByLabelText('From Node')).toBeInTheDocument();
  expect(getByLabelText('To Node')).toBeInTheDocument();
});

test('when form values are selected, update is called correctly', () => {
  const {getByText, getAllByTitle} = render(
    <TestApp>
      <LinkForm {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getAllByTitle('Open')[1]);
  fireEvent.click(getByText('site1-0'));
  expect(mockUpdateTopology).toHaveBeenCalledWith({
    links: [
      {
        a_node_mac: '',
        a_node_name: '',
        is_backup_cn_link: false,
        link_type: 1,
        z_node_mac: '',
        z_node_name: 'site1-0',
      },
    ],
  });
});
