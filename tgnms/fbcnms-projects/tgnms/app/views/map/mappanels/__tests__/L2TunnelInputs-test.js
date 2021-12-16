/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as mockConfigAPIUtil from '@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil';
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
import {act, fireEvent, render, within} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';

const tunnelConfigs = JSON.stringify({
  [FIG0.NODE1_0]: {
    tunnelConfig: {
      test1: {},
      TunnelNodeToNode: {
        enabled: true,
        localInterface: 'MyInterface1',
        dstNodeName: FIG0.NODE2_0,
        tunnelType: 'GRE_L2',
        dstIp: null,
      },
      TunnelExternalIP: {
        enabled: true,
        localInterface: 'MyInterface1',
        dstNodeName: null,
        tunnelType: 'GRE_L2',
        dstIp: '2.2.2.2',
      },
    },
  },
  [FIG0.NODE2_0]: {
    tunnelConfig: {
      test2: {},
      TunnelNodeToNode: {
        enabled: true,
        localInterface: 'MyInterface2',
        dstNodeName: FIG0.NODE1_0,
        tunnelType: 'GRE_L2',
        dstIp: null,
      },
    },
  },
  [FIG0.NODE3_0]: {
    tunnelConfig: {},
  },
});

describe('Edit mode', () => {
  test('edit a node to node tunnel', async () => {
    const mockSetNodeOverridesConfig = jest.spyOn(
      mockConfigAPIUtil,
      'setNodeOverridesConfig',
    );
    const {getByLabelText, getByTestId} = renderApp({
      nodeName: FIG0.NODE1_0,
      tunnelName: 'TunnelNodeToNode',
    });
    // Ensure form is filled in with initial data.
    expect(
      convertType<HTMLInputElement>(getByLabelText(/tunnel name/i)).value,
    ).toEqual('TunnelNodeToNode');

    await selectEvent.select(getByLabelText(/tunnel type/i), 'SRV6', {
      container: document.body,
    });
    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    expect(mockSetNodeOverridesConfig).toHaveBeenCalledWith(
      'MyNetworkTest',
      {
        [FIG0.NODE1_0]: {
          tunnelConfig: {
            TunnelNodeToNode: {
              enabled: true,
              dstNodeName: FIG0.NODE2_0,
              localInterface: 'MyInterface1',
              tunnelType: 'SRV6',
              tunnelParams: {},
            },
          },
        },
        [FIG0.NODE2_0]: {
          tunnelConfig: {
            TunnelNodeToNode: {
              enabled: true,
              dstNodeName: FIG0.NODE1_0,
              localInterface: 'MyInterface2',
              tunnelType: 'SRV6',
              tunnelParams: {},
            },
          },
        },
      },
      expect.anything(),
      expect.anything(),
    );
  });
  test('edit an external ip tunnel', async () => {
    const mockSetNodeOverridesConfig = jest.spyOn(
      mockConfigAPIUtil,
      'setNodeOverridesConfig',
    );
    const {getByLabelText, getByTestId} = renderApp({
      nodeName: FIG0.NODE1_0,
      tunnelName: 'TunnelExternalIP',
    });
    // Ensure form is filled in with initial data.
    expect(
      convertType<HTMLInputElement>(getByLabelText(/tunnel name/i)).value,
    ).toEqual('TunnelExternalIP');

    // Sanity Check: making changes updates the form.
    await selectEvent.select(getByLabelText(/tunnel type/i), 'SRV6', {
      container: document.body,
    });
    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    expect(mockSetNodeOverridesConfig).toHaveBeenCalledWith(
      'MyNetworkTest',
      {
        [FIG0.NODE1_0]: {
          tunnelConfig: {
            TunnelExternalIP: {
              enabled: true,
              localInterface: 'MyInterface1',
              tunnelType: 'SRV6',
              dstIp: '2.2.2.2',
              tunnelParams: {},
            },
          },
        },
      },
      expect.anything(),
      expect.anything(),
    );
  });
  test('pointing tunnel to a different node deletes the destination node', async () => {
    const mockSetNodeOverridesConfig = jest.spyOn(
      mockConfigAPIUtil,
      'setNodeOverridesConfig',
    );
    const {getByLabelText, getByTestId, onDeleteMock} = renderApp({
      nodeName: FIG0.NODE1_0,
      tunnelName: 'TunnelNodeToNode',
    });
    // Ensure form is filled in with initial data.
    expect(
      convertType<HTMLInputElement>(getByLabelText(/tunnel name/i)).value,
    ).toEqual('TunnelNodeToNode');

    await selectEvent.select(getByLabelText(/node 2 \*/i), FIG0.NODE3_0, {
      container: document.body,
    });

    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    // Ensure new tunnel is saved.
    expect(mockSetNodeOverridesConfig).toHaveBeenCalledWith(
      'MyNetworkTest',
      {
        [FIG0.NODE1_0]: {
          tunnelConfig: {
            TunnelNodeToNode: {
              enabled: true,
              dstNodeName: FIG0.NODE3_0,
              localInterface: 'MyInterface1',
              tunnelType: 'GRE_L2',
              tunnelParams: {},
            },
          },
        },
        [FIG0.NODE3_0]: {
          tunnelConfig: {
            TunnelNodeToNode: {
              enabled: true,
              dstNodeName: FIG0.NODE1_0,
              localInterface: 'MyInterface2',
              tunnelType: 'GRE_L2',
              tunnelParams: {},
            },
          },
        },
      },
      expect.anything(),
      expect.anything(),
    );
    // make sure the old node is deleted.
    expect(onDeleteMock).toHaveBeenCalledWith([
      'site2-0.tunnelConfig.TunnelNodeToNode',
    ]);
  });
  test('converting a node-to-node tunnel to node-to-ip deletes the destination node', async () => {
    const mockSetNodeOverridesConfig = jest.spyOn(
      mockConfigAPIUtil,
      'setNodeOverridesConfig',
    );
    const {getByLabelText, getByTestId, onDeleteMock} = renderApp({
      nodeName: FIG0.NODE1_0,
      tunnelName: 'TunnelNodeToNode',
    });

    await selectEvent.select(
      getByLabelText(/tunneling to \*/i),
      'External IP Address',
      {
        container: document.body,
      },
    );
    act(() => {
      fireEvent.change(getByLabelText(/external ip address/i), {
        target: {value: '1.1.1.1'},
      });
    });

    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    // Ensure new tunnel is saved.
    expect(mockSetNodeOverridesConfig).toHaveBeenCalledWith(
      'MyNetworkTest',
      {
        [FIG0.NODE1_0]: {
          tunnelConfig: {
            TunnelNodeToNode: {
              enabled: true,
              dstIp: '1.1.1.1',
              localInterface: 'MyInterface1',
              tunnelType: 'GRE_L2',
              tunnelParams: {},
            },
          },
        },
      },
      expect.anything(),
      expect.anything(),
    );
    // make sure the old node is deleted.
    expect(onDeleteMock).toHaveBeenCalledWith([
      'site2-0.tunnelConfig.TunnelNodeToNode',
    ]);
  });

  describe('delete', () => {
    test('delete an external ip tunnel', async () => {
      const {getByText, getByTestId, onDeleteMock} = renderApp({
        nodeName: FIG0.NODE1_0,
        tunnelName: 'TunnelExternalIP',
      });

      act(() => {
        fireEvent.click(getByText(/delete/i));
      });
      act(() => {
        fireEvent.click(
          within(getByTestId('delete-modal')).getByText('Delete'),
        );
      });
      expect(onDeleteMock).toHaveBeenCalledWith([
        'site1-0.tunnelConfig.TunnelExternalIP',
      ]);
    });
    test('delete a node to node tunnel', async () => {
      const {getByText, getByTestId, onDeleteMock} = renderApp({
        nodeName: FIG0.NODE1_0,
        tunnelName: 'TunnelNodeToNode',
      });

      act(() => {
        fireEvent.click(getByText(/delete/i));
      });
      act(() => {
        fireEvent.click(
          within(getByTestId('delete-modal')).getByText('Delete'),
        );
      });
      expect(onDeleteMock).toHaveBeenCalledWith([
        'site1-0.tunnelConfig.TunnelNodeToNode',
        'site2-0.tunnelConfig.TunnelNodeToNode',
      ]);
    });
  });
});

test('renders empty without crashing', () => {
  const {getByLabelText} = renderApp();
  expect(getByLabelText('Node 1 *')).toBeInTheDocument();
});
describe('Create mode', () => {
  test('creates 2 tunnel configs, one for each node', async () => {
    const mockSetNodeOverridesConfig = jest.spyOn(
      mockConfigAPIUtil,
      'setNodeOverridesConfig',
    );

    const {getByLabelText, getByTestId} = renderApp();
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

    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    expect(mockSetNodeOverridesConfig).toHaveBeenLastCalledWith(
      'MyNetworkTest',
      {
        [FIG0.NODE1_0]: {
          tunnelConfig: {
            'Test tunnel name': {
              enabled: true,
              dstNodeName: FIG0.NODE2_0,
              localInterface: '',
              tunnelType: 'SRV6',
              tunnelParams: {
                vlanId: 100,
              },
            },
          },
        },
        [FIG0.NODE2_0]: {
          tunnelConfig: {
            'Test tunnel name': {
              enabled: true,
              dstNodeName: FIG0.NODE1_0,
              localInterface: '',
              tunnelType: 'SRV6',
              tunnelParams: {
                vlanId: 100,
              },
            },
          },
        },
      },
      expect.anything(),
      expect.anything(),
    );
  });
  test('creates 1 tunnel config for external ip address', async () => {
    const mockSetNodeOverridesConfig = jest.spyOn(
      mockConfigAPIUtil,
      'setNodeOverridesConfig',
    );

    const {getByLabelText, getByTestId} = renderApp();
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

    await selectEvent.select(
      getByLabelText(/tunneling to \*/i),
      'External IP Address',
      {
        container: document.body,
      },
    );
    act(() => {
      fireEvent.change(getByLabelText(/external ip address/i), {
        target: {value: '1.1.1.1'},
      });
    });

    act(() => {
      fireEvent.click(getByTestId('submit-button'));
    });
    expect(mockSetNodeOverridesConfig).toHaveBeenLastCalledWith(
      'MyNetworkTest',
      {
        [FIG0.NODE1_0]: {
          tunnelConfig: {
            'Test tunnel name': {
              dstIp: '1.1.1.1',
              enabled: true,
              localInterface: '',
              tunnelParams: {vlanId: 100},
              tunnelType: 'SRV6',
            },
          },
        },
      },
      expect.anything(),
      expect.anything(),
    );
  });
  describe('disables submit', () => {
    test('node to node', async () => {
      const {getByLabelText, getByTestId} = renderApp();
      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'New Name'},
        });
      });
      await selectEvent.select(getByLabelText(/node 1 \*/i), FIG0.NODE1_0, {
        container: document.body,
      });
      expect(getByTestId('submit-button')).toBeDisabled(); // need two nodes
      await selectEvent.select(getByLabelText(/node 2 \*/i), FIG0.NODE2_0, {
        container: document.body,
      });
      expect(getByTestId('submit-button')).not.toBeDisabled(); // GOOD!

      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'Test1'}, // name already exists in node 1
        });
      });
      expect(getByTestId('submit-button')).toBeDisabled();

      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'Test2'}, // name already exists in node 2
        });
      });
      expect(getByTestId('submit-button')).toBeDisabled();

      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'my New name'},
        });
      });
      expect(getByTestId('submit-button')).not.toBeDisabled();
    });
    test('single node', async () => {
      const {getByLabelText, getByTestId} = renderApp();
      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'New Name'},
        });
      });
      await selectEvent.select(
        getByLabelText(/tunneling to \*/i),
        'External IP Address',
        {
          container: document.body,
        },
      );
      await selectEvent.select(getByLabelText(/node 1 \*/i), FIG0.NODE1_0, {
        container: document.body,
      });
      expect(getByTestId('submit-button')).toBeDisabled(); // needs ip address
      act(() => {
        fireEvent.change(getByLabelText(/external ip address/i), {
          target: {value: '1.1.1.1'},
        });
      });
      expect(getByTestId('submit-button')).not.toBeDisabled();

      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'Test1  '}, // name already exists in node 1
        });
      });
      expect(getByTestId('submit-button')).toBeDisabled();
      act(() => {
        fireEvent.change(getByLabelText(/tunnel name/i), {
          target: {value: 'New Name'},
        });
      });
      expect(getByTestId('submit-button')).not.toBeDisabled();
    });
  });
});

const renderApp = (initialParams = null) => {
  const topology = mockFig0();
  const onDeleteMock = jest.fn();
  const res = render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkName: 'MyNetworkTest',
          networkConfig: mockNetworkConfig({
            topology,
            config_node_overrides: {overrides: tunnelConfigs},
          }),
          ...buildTopologyMaps(topology),
        }}>
        <TaskConfigContextWrapper
          contextValue={{
            nodeOverridesConfig: {},
            onDelete: onDeleteMock,
          }}>
          <L2TunnelInputs initialParams={initialParams} onClose={() => {}} />
        </TaskConfigContextWrapper>
      </NetworkContextWrapper>
    </TestApp>,
  );
  return {
    ...res,
    onDeleteMock,
  };
};
