/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import LinkDetailsPanel from '../LinkDetailsPanel';
import axios from 'axios';
import {TestApp, mockTopology} from '../../../tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
import {
  mockMultiHop,
  mockNetworkConfig,
} from '../../../tests/data/NetworkConfig';

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
};

afterEach(() => {
  jest.clearAllMocks();
});

it('test setIgnitionState endpoint failed', async () => {
  const mock = jest.spyOn(axios, 'post');

  mock.mockResolvedValue({
    data: {
      success: true,
      msg: 'yay',
    },
  });
  mock.mockResolvedValueOnce({
    data: {
      success: false,
      msg: 'boo',
    },
  });

  const {nodeMap} = buildTopologyMaps(mockMultiHop(4, false));
  const props = {...commonProps, nodeMap};
  const {getByText, baseElement} = render(
    <TestApp>
      <LinkDetailsPanel {...props} />
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText('View Actions\u2026'));
  });
  await act(async () => {
    fireEvent.click(getByText('Delete Link'));
  });
  await act(async () => {
    fireEvent.click(baseElement.getElementsByClassName('swal2-confirm')[0]);
  });
  // We expect that one API call failing will not prevent the rest of the calls.
  expect(mock).toHaveBeenCalledTimes(3);
});

it('test setLinkStatus endpoint failed', async () => {
  const mock = jest.spyOn(axios, 'post');

  mock.mockResolvedValueOnce({
    data: {
      success: false,
      msg: 'boo',
    },
  });
  mock.mockResolvedValueOnce({
    data: {
      success: true,
      msg: 'yay',
    },
  });
  mock.mockResolvedValueOnce({
    data: {
      success: true,
      msg: 'yay',
    },
  });

  const {nodeMap} = buildTopologyMaps(mockMultiHop(4, false));
  const props = {...commonProps, nodeMap};
  const {getByText, baseElement} = render(
    <TestApp>
      <LinkDetailsPanel {...props} />
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText('View Actions\u2026'));
  });
  await act(async () => {
    fireEvent.click(getByText('Delete Link'));
  });
  await act(async () => {
    fireEvent.click(baseElement.getElementsByClassName('swal2-confirm')[0]);
  });
  // We expect that one API call failing will not prevent the rest of the calls.
  expect(mock).toHaveBeenCalledTimes(3);
});

it('all three API calls successful', async () => {
  const mock = jest.spyOn(axios, 'post');

  mock.mockResolvedValue({
    data: {
      success: true,
      msg: 'yay',
    },
  });

  const {nodeMap} = buildTopologyMaps(mockMultiHop(4, false));
  const props = {...commonProps, nodeMap};
  const {getByText, baseElement} = render(
    <TestApp>
      <LinkDetailsPanel {...props} />
    </TestApp>,
  );
  await act(async () => {
    fireEvent.click(getByText('View Actions\u2026'));
  });
  await act(async () => {
    fireEvent.click(getByText('Delete Link'));
  });
  await act(async () => {
    fireEvent.click(baseElement.getElementsByClassName('swal2-confirm')[0]);
  });
  expect(mock).toHaveBeenCalledTimes(3);
});
