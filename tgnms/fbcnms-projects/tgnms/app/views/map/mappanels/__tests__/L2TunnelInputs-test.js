/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import L2TunnelInputs from '../L2TunnelInputs';
import React from 'react';
import selectEvent from 'react-select-event';
import {
  FIG0,
  NetworkContextWrapper,
  TaskConfigContextWrapper,
  TestApp,
  mockFig0,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <L2TunnelInputs />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Node 1 *')).toBeInTheDocument();
});

describe('Node dest', () => {
  test('creates 2 tunnel configs, one for each node', async () => {
    const topology = mockFig0();
    const onUpdateMock = jest.fn();
    const {getByLabelText} = render(
      <TestApp>
        <NetworkContextWrapper
          contextValue={{
            networkName: 'test',
            networkConfig: mockNetworkConfig({topology}),
            ...buildTopologyMaps(topology),
          }}>
          <TaskConfigContextWrapper contextValue={{onUpdate: onUpdateMock}}>
            <L2TunnelInputs />
          </TaskConfigContextWrapper>
        </NetworkContextWrapper>
      </TestApp>,
    );
    act(() => {
      fireEvent.change(getByLabelText(/tunnel name/i), {
        target: {value: 'Test tunnel name'},
      });
    });
    await selectEvent.select(getByLabelText(/tunnel type/i), 'SRV6', {
      container: document.body,
    });

    // vlan
    act(() => {
      fireEvent.change(getByLabelText(/vlan id/i), {
        target: {value: '100'},
      });
    });
    await selectEvent.select(getByLabelText(/node 1 \*/i), FIG0.NODE1_0, {
      container: document.body,
    });
    await selectEvent.select(getByLabelText(/node 2 \*/i), FIG0.NODE2_0, {
      container: document.body,
    });
    expect(onUpdateMock.mock.calls[0][0]).toMatchObject({
      configField: FIG0.NODE1_0,
      draftValue: {
        tunnelConfig: {
          'Test tunnel name': {
            enabled: true,
            dstNodeName: FIG0.NODE2_0,
            tunnelType: 'SRV6',
            tunnelParams: {
              vlanId: 100,
            },
          },
        },
      },
    });
    expect(onUpdateMock.mock.calls[1][0]).toMatchObject({
      configField: FIG0.NODE2_0,
      draftValue: {
        tunnelConfig: {
          'Test tunnel name': {
            enabled: true,
            tunnelType: 'SRV6',
            dstNodeName: FIG0.NODE1_0,
            tunnelParams: {
              vlanId: 100,
            },
          },
        },
      },
    });
  });
});
