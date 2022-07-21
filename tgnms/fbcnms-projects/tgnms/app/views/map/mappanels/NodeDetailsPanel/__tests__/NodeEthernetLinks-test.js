/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import NodeEthernetLinks from '../NodeEthernetLinks';
import React from 'react';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {TestApp, renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {
  mockLink,
  mockNode,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const defaultProps = {
  node: mockNode({name: 'testNode', site_name: '11L922'}),
  topology: mockTopology({
    name: 'Tower Q',
    links: [
      mockLink({
        name: 'link1',
        link_type: LinkTypeValueMap.ETHERNET,
        a_node_name: '11M237.2',
        z_node_name: 'testNode',
      }),
      mockLink({
        name: 'link2',
        link_type: LinkTypeValueMap.ETHERNET,
        a_node_name: '11M237.1',
        z_node_name: 'testNode',
      }),
    ],
  }),
};

test('renders empty without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeEthernetLinks node={mockNode()} topology={mockTopology()} />,
    </TestApp>,
  );
  expect(getByText(',')).toBeInTheDocument();
});

test('renders with ethernet links', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeEthernetLinks {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Ethernet Links')).toBeInTheDocument();

  expect(getByText('11M237.1')).toBeInTheDocument();
  expect(getByText('11M237.2')).toBeInTheDocument();
});
