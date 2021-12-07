/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import * as TopologyHelpers from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import * as scanApi from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import NodeDetailsPanel from '../NodeDetailsPanel';
import React from 'react';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {NodeStatusTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  mockNode,
  mockNodeDetails,
  mockTopology,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, within} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig();
});

jest.mock('@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil', () => ({
  startExecution: jest.fn().mockImplementation(() => Promise.resolve()),
}));

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/helpers/ConfigHelpers'),
    'getTopologyNodeList',
  )
  .mockReturnValue([{name: 'testNode'}, {name: 'mock filter node'}]);

const testNodeName = 'NODEA';
const empty = () => {};
const commonProps = {
  nodeDetailsProps: mockNodeDetails(),
  networkName: 'MockNetworkName',
  nearbyNodes: {},
  nodes: new Set(),
  links: {},
  expanded: true,
  onPin: empty,
  node: mockNode({name: testNodeName}),
  onPanelChange: empty,
  onEdit: empty,
  onClose: empty,
  onUpdateNearbyNodes: empty,
  onUpdateRoutes: _ => {},
  resetRoutes: jest.fn(),
  pinned: true,
  nodeToLinksMap: {},
  linkMap: {},
  snackbars: {error: empty, success: empty, warning: empty},
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
    expect(within(node2group).getByText('Online').textContent).toBe('Online');
    expect(within(node4group).getByText('Offline').textContent).toBe('Offline');
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
    expect(within(onlineGroup).getByText('Online').textContent).toBe('Online');
    expect(within(offlineGroup).getByText('Offline').textContent).toBe(
      'Offline',
    );
    expect(within(unknownGroup).getByText('Unknown').textContent).toBe(
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

  describe('Start IM Scan', () => {
    test('clicking a radio mac starts an IM scan', () => {
      const mock_node = mockNode({
        name: 'node1',
        status: NodeStatusTypeValueMap.ONLINE,
        site_name: 'site1',
        wlan_mac_addrs: ['radioMacTest1', 'radioMacTest2', 'radioMacTest3'],
        mac_addr: 'nodeMacAddrTest',
      });

      const {getByText, getAllByText} = renderWithRouter(
        <TestApp>
          <NodeDetailsPanel {...commonProps} node={mock_node} />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      fireEvent.mouseEnter(getByText('Start IM Scan'));
      const elems = getAllByText('radioMacTest2');
      fireEvent.click(elems[1]);
      expect(scanApi.startExecution).toHaveBeenCalledWith({
        networkName: 'MockNetworkName',
        mode: 2,
        type: 2,
        options: {
          tx_wlan_mac: 'radioMacTest2',
        },
      });
    });
  });

  describe('Edit L2 Tunnel', () => {
    test('clicking on tunnel starts edit mode', () => {
      jest.spyOn(TopologyHelpers, 'getConfigOverrides');
      jest.spyOn(TopologyHelpers, 'getTunnelConfigs').mockReturnValue({
        Tunnel1: {},
        Tunnel2: {},
      });
      const mockOnEditTunnel = jest.fn();
      const mock_node = mockNode({name: 'node1'});

      const {getByText} = renderWithRouter(
        <TestApp>
          <NodeDetailsPanel
            {...commonProps}
            node={mock_node}
            onEditTunnel={mockOnEditTunnel}
          />
        </TestApp>,
      );
      fireEvent.click(getByText(/View Actions/i));
      fireEvent.mouseEnter(getByText('Edit L2 Tunnel'));
      act(() => {
        fireEvent.click(getByText('Tunnel1'));
      });
      expect(mockOnEditTunnel).toHaveBeenCalledWith({
        nodeName: 'node1',
        tunnelName: 'Tunnel1',
      });
    });
  });
});
