/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import NodeDetailsPanel from '../NodeDetailsPanel';
import React from 'react';
import {
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockNode,
  mockTopology,
  renderWithRouter,
} from '../../../tests/testHelpers';
/*
 * Use queries directly for querying children of nodes other than document.body
 */
import {LinkTypeValueMap} from '../../../../shared/types/Topology';
import {cleanup, fireEvent, queries} from '@testing-library/react';

afterEach(cleanup);

beforeEach(() => {
  initWindowConfig();
});

const testNodeName = 'NODEA';
const commonProps = {
  node: mockNode({name: testNodeName}),
  networkNodeHealth: {startTime: 0, endTime: 0, events: {}},
  networkConfig: mockNetworkConfig(),
  topology: mockTopology(),

  ctrlVersion: '',
  networkName: '',
  nearbyNodes: {},
  nodes: new Set(),
  links: {},
  expanded: true,
  onPin: () => {},
  onSelectLink: () => {},
  onSelectSite: () => {},
  onPanelChange: () => {},
  onEdit: () => {},
  onClose: () => {},
  onUpdateNearbyNodes: () => {},
  onUpdateRoutes: _ => {},
  pinned: true,
  routes: {node: ''},
};

test('renders', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NodeDetailsPanel {...commonProps} />
    </TestApp>,
  );
  expect(getByText(testNodeName)).toBeInTheDocument();
});

describe('Ethernet Links', () => {
  test('if there are no ethernet links, the section is not shown', () => {
    const topology = mockTopology();
    const node = mockNode({
      name: 'node1',
      site_name: 'site1',
    });
    topology.__test
      .addNode(node)
      .addNode({
        name: 'node2',
        site_name: 'site2',
      })
      .addLink({
        a_node_name: 'node1',
        z_node_name: 'node2',
        link_type: LinkTypeValueMap.WIRELESS,
      });
    const {queryByText} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel {...commonProps} node={node} topology={topology} />
      </TestApp>,
    );
    expect(queryByText('Ethernet Links')).not.toBeInTheDocument();
  });

  test('if there are ethernet links, the section is shown', () => {
    const {node, topology} = ethernetTopology();
    const {getByText} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel {...commonProps} node={node} topology={topology} />
      </TestApp>,
    );
    expect(getByText('Ethernet Links')).toBeInTheDocument();
  });

  test('only remote node is shown in ethernet links section', () => {
    const {node, topology} = ethernetTopology();
    const {getByText, queryByTestId} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel {...commonProps} node={node} topology={topology} />
      </TestApp>,
    );
    expect(getByText('node2')).toBeInTheDocument();
    expect(queryByTestId('node1')).not.toBeInTheDocument();
    expect(queryByTestId('node3')).not.toBeInTheDocument();
  });

  test('ethernet links show offline/online', () => {
    const {node, topology} = ethernetTopology();
    topology.__test
      .addNode({
        name: 'node4',
        site_name: 'node4',
      })
      .addLink({
        a_node_name: 'node1',
        z_node_name: 'node4',
        link_type: LinkTypeValueMap.ETHERNET,
        is_alive: false,
      });
    const {getByTestId} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel {...commonProps} node={node} topology={topology} />
      </TestApp>,
    );
    const node2group = getByTestId('node2');
    const node4group = getByTestId('node4');
    expect(queries.getByText(node2group, 'Online').textContent).toBe('Online');
    expect(queries.getByText(node4group, 'Offline').textContent).toBe(
      'Offline',
    );
  });

  function ethernetTopology() {
    const topology = mockTopology();
    const node = mockNode({
      name: 'node1',
      site_name: 'site1',
    });
    topology.__test
      .addNode(node)
      .addNode({
        name: 'node2',
        site_name: 'site2',
      })
      .addLink({
        a_node_name: 'node1',
        z_node_name: 'node2',
        link_type: LinkTypeValueMap.ETHERNET,
      })
      //these should not appear in the ethernet links section
      .addNode({
        name: 'node3',
        site_name: 'site3',
      })
      .addLink({
        a_node_name: 'node1',
        z_node_name: 'node3',
        link_type: LinkTypeValueMap.WIRELESS,
      });

    return {
      node,
      topology,
    };
  }
});

describe('Actions', () => {
  describe('Edit Node', () => {
    test('clicking Edit Node calls onEdit and onClose', () => {
      expect.assertions(2);
      const onEditMock = jest.fn();
      const onCloseMock = jest.fn();
      const {getByText} = renderWithRouter(
        <TestApp>
          <NodeDetailsPanel
            {...commonProps}
            onEdit={onEditMock}
            onClose={onCloseMock}
          />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      fireEvent.click(getByText('Edit Node'));
      expect(onEditMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
