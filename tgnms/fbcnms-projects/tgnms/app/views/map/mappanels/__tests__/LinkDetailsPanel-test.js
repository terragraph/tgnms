/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import LinkDetailsPanel from '../LinkDetailsPanel';
import axios from 'axios';
import {
  FIG0,
  mockFig0,
  mockMultiHop,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {LinkActionTypeValueMap} from '@fbcnms/tg-nms/shared/types/Controller';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {TestApp, mockTopology} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';

jest.mock('axios');
const commonProps = {
  expanded: true,
  networkName: 'test',
  nodeMap: {},
  networkConfig: mockNetworkConfig(),
  networkLinkHealth: {
    startTime: 0,
    endTime: 0,
    events: {},
  },
  link: {
    name: 'link',
    a_node_name: 'node0',
    z_node_name: 'node1',
    link_type: 0,
    linkup_attempts: 0,
    is_alive: true,
    a_node_mac: '',
    z_node_mac: '',
    _meta_: {
      distance: 0,
      angle: 0,
    },
  },
  ignitionEnabled: false,
  networkLinkMetrics: {},
  onClose: jest.fn(),
  onPanelChange: jest.fn(),
  onPin: jest.fn(),
  onSelectNode: jest.fn(),
  pinned: false,
  topology: mockTopology(),
  azimuthManager: {
    addLink: jest.fn(),
    deleteLink: jest.fn(),
    moveSite: jest.fn(),
    deleteSite: jest.fn(),
  },
};

describe('Delete Link', () => {
  test('Brings down link and sends force parameter if force is checked', async () => {
    const mock = jest.spyOn(axios, 'post');
    mock.mockResolvedValue({
      data: {
        success: true,
      },
    });
    const {nodeMap} = buildTopologyMaps(mockMultiHop(4, false));
    const props = {...commonProps, nodeMap};
    const {getByText} = render(
      <TestApp>
        <LinkDetailsPanel {...props} />
      </TestApp>,
    );
    await act(async () => {
      fireEvent.click(getByText('View Actions'));
    });
    await act(async () => {
      fireEvent.click(getByText('Delete Link'));
    });
    await act(async () => {
      fireEvent.click(getByText(/Confirm/i));
    });
    expect(mock).nthCalledWith(
      1,
      '/apiservice/test/api/setIgnitionState',
      {
        enable: true,
        linkAutoIgnite: {
          link: false,
        },
      },
      undefined,
    );
    expect(mock).nthCalledWith(
      2,
      '/apiservice/test/api/setLinkStatus',
      {
        initiatorNodeName: 'node0',
        responderNodeName: 'node1',
        action: LinkActionTypeValueMap.LINK_DOWN,
      },
      undefined,
    );
    expect(mock).nthCalledWith(
      3,
      '/apiservice/test/api/delLink',
      {
        aNodeName: 'node0',
        zNodeName: 'node1',
        force: true,
      },
      undefined,
    );
  });

  test('If one node is a CN, selects the DN to initiate the dissoc', async () => {
    const mock = jest.spyOn(axios, 'post');
    mock.mockResolvedValue({
      data: {
        success: true,
      },
    });
    const topology = mockFig0();
    const link1 = topology.__test.getLink(FIG0.LINK1);
    const link2 = topology.__test.getLink(FIG0.LINK2);
    if (!(link1 && link2)) {
      throw new Error('Links not found');
    }
    // expect(link1.a_node_name).toBe(FIG0.)
    // make sure that DN is always selected as initiaor
    topology.__test.updateNode(FIG0.NODE1_1, {
      node_type: NodeTypeValueMap.CN,
    });
    topology.__test.updateNode(FIG0.NODE2_0, {
      node_type: NodeTypeValueMap.DN,
    });
    topology.__test.updateNode(FIG0.NODE2_1, {
      node_type: NodeTypeValueMap.CN,
    });
    topology.__test.updateNode(FIG0.NODE3_0, {
      node_type: NodeTypeValueMap.DN,
    });

    const {nodeMap} = buildTopologyMaps(topology);
    const {getByText, rerender} = render(
      <TestApp>
        <LinkDetailsPanel {...commonProps} link={link1} nodeMap={nodeMap} />
      </TestApp>,
    );
    await act(async () => {
      fireEvent.click(getByText('View Actions'));
    });
    await act(async () => {
      fireEvent.click(getByText('Delete Link'));
    });
    await act(async () => {
      fireEvent.click(getByText(/Confirm/i));
    });
    expect(mock).nthCalledWith(
      2,
      '/apiservice/test/api/setLinkStatus',
      {
        initiatorNodeName: FIG0.NODE2_0,
        responderNodeName: FIG0.NODE1_1,
        action: LinkActionTypeValueMap.LINK_DOWN,
      },
      undefined,
    );

    rerender(
      <TestApp>
        <LinkDetailsPanel {...commonProps} nodeMap={nodeMap} link={link2} />
      </TestApp>,
    );
    await act(async () => {
      fireEvent.click(getByText('View Actions'));
    });
    await act(async () => {
      fireEvent.click(getByText('Delete Link'));
    });
    await act(async () => {
      fireEvent.click(getByText(/Confirm/i));
    });
    expect(mock).nthCalledWith(
      6,
      '/apiservice/test/api/setLinkStatus',
      {
        initiatorNodeName: FIG0.NODE3_0,
        responderNodeName: FIG0.NODE2_1,
        action: LinkActionTypeValueMap.LINK_DOWN,
      },
      undefined,
    );
  });
});
