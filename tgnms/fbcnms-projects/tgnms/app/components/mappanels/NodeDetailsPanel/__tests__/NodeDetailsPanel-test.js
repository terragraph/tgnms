/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import NodeDetailsPanel from '../NodeDetailsPanel';
import React from 'react';
import {NodeStatusTypeValueMap} from '../../../../../shared/types/Topology';
import {
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockNode,
  mockNodeDetails,
  mockTopology,
  renderWithRouter,
} from '../../../../tests/testHelpers';
/*
 * Use queries directly for querying children of nodes other than document.body
 */
import {LinkTypeValueMap} from '../../../../../shared/types/Topology';
import {cleanup, fireEvent, queries} from '@testing-library/react';

afterEach(cleanup);

beforeEach(() => {
  initWindowConfig();
});

const testNodeName = 'NODEA';
const commonProps = {
  nodeDetailsProps: mockNodeDetails(),
  networkName: '',
  nearbyNodes: {},
  nodes: new Set(),
  links: {},
  expanded: true,
  onPin: () => {},
  node: mockNode({name: testNodeName}),
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
        <NodeDetailsPanel
          {...commonProps}
          node={node}
          nodeDetailsProps={mockNodeDetails({topology: topology})}
        />
      </TestApp>,
    );
    expect(queryByText('Ethernet Links')).not.toBeInTheDocument();
  });

  test('if there are ethernet links, the section is shown', () => {
    const {node, topology} = ethernetTopology();
    const {getByText} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel
          {...commonProps}
          node={node}
          nodeDetailsProps={mockNodeDetails({topology: topology})}
        />
      </TestApp>,
    );
    expect(getByText('Ethernet Links')).toBeInTheDocument();
  });

  test('only remote node is shown in ethernet links section', () => {
    const {node, topology} = ethernetTopology();
    const {getByText, queryByTestId} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel
          {...commonProps}
          node={node}
          nodeDetailsProps={mockNodeDetails({topology: topology})}
        />
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
        <NodeDetailsPanel
          {...commonProps}
          node={node}
          nodeDetailsProps={mockNodeDetails({topology: topology})}
        />
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

describe('Radio MACs', () => {
  test('if there are no radio macs, the section is not shown', () => {
    const {queryByText} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel {...commonProps} />
      </TestApp>,
    );
    expect(queryByText('Radio MACs')).not.toBeInTheDocument();
  });

  test('there are radio macs, hardware is before v43, radio macs are shown without status', () => {
    const {networkConfig, node} = radioProps();
    const {getByText} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel
          {...commonProps}
          nodeDetailsProps={mockNodeDetails({
            ctrlVersion: '0',
            networkConfig: networkConfig,
          })}
          node={node}
        />
      </TestApp>,
    );
    expect(getByText('Radio MACs')).toBeInTheDocument();
    expect(getByText('radioMacTestOnline')).toBeInTheDocument();
    expect(getByText('radioMacTestOffline')).toBeInTheDocument();
    expect(getByText('radioMacTestUnknown')).toBeInTheDocument();
  });

  test('there are radio macs, hardware is after v43, so radio macs with status are shown', () => {
    const {networkConfig, node} = radioProps();
    const {getByTestId} = renderWithRouter(
      <TestApp>
        <NodeDetailsPanel
          {...commonProps}
          nodeDetailsProps={mockNodeDetails({
            ctrlVersion:
              'Facebook Terragraph Release RELEASE_M43_PRE-77-g4044506c6-ljoswiak (ljoswiak@devvm1074 Tue Sep  3 22:01:21 UTC 201',
            networkConfig: networkConfig,
          })}
          node={node}
        />
      </TestApp>,
    );
    const onlineGroup = getByTestId('radioMacTestOnline');
    const offlineGroup = getByTestId('radioMacTestOffline');
    const unknownGroup = getByTestId('radioMacTestUnknown');
    expect(queries.getByText(onlineGroup, 'Online').textContent).toBe('Online');
    expect(queries.getByText(offlineGroup, 'Offline').textContent).toBe(
      'Offline',
    );
    expect(queries.getByText(unknownGroup, 'Unknown').textContent).toBe(
      'Unknown',
    );
  });

  function radioProps() {
    const networkConfig = mockNetworkConfig({
      topologyConfig: {polarity: {}},
      status_dump: {
        statusReports: {
          nodeMacAddrTest: {
            timeStamp: 0,
            ipv6Address: '',
            version: '',
            ubootVersion: '',
            status: 'ONLINE',
            upgradeStatus: {
              usType: 'NONE',
              nextImage: {md5: '', version: ''},
              reason: '',
              upgradeReqId: '',
              whenToCommit: 0,
            },
            configMd5: '',
            bgpStatus: {},
            radioStatus: {
              radioMacTestOnline: {initialized: true, gpsSync: true},
              radioMacTestOffline: {initialized: false, gpsSync: true},
            },
          },
        },
        timeStamp: 0,
      },
    });

    const node = mockNode({
      name: 'node1',
      status: NodeStatusTypeValueMap.ONLINE,
      site_name: 'site1',
      wlan_mac_addrs: [
        'radioMacTestOnline',
        'radioMacTestOffline',
        'radioMacTestUnknown',
      ],
      mac_addr: 'nodeMacAddrTest',
    });

    return {
      networkConfig,
      node,
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
