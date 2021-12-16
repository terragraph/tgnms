/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NodeForm from '../NodeForm';
import {EMPTY_TOPOLOGY} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render, within} from '@testing-library/react';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {
  mockTopologyBuilderContext,
  selectAutocompleteItem,
} from '@fbcnms/tg-nms/app/tests/testHelpers';

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
  const {getByLabelText} = render(
    <TestApp>
      <NodeForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByLabelText('Node Name')).toBeInTheDocument();
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

test('can edit node type', () => {
  mockUseTopologyBuilderContext.mockImplementationOnce(() =>
    mockTopologyBuilderContext({
      updateTopology: mockUpdateTopology,
      formType: FORM_TYPE.EDIT, // note we are in edit mode
      elementType: TOPOLOGY_ELEMENT.NODE,
      initialParams: {
        ...EMPTY_TOPOLOGY,
        nodes: [
          {
            name: 'MyNode',
            node_type: 1, // Current selection is CN.
            pop_node: false,
            site_name: 'MySiteName',
          },
        ],
      },
    }),
  );
  const {getByTestId} = render(
    <TestApp>
      <NodeForm {...defaultProps} />
    </TestApp>,
  );
  const autocomplete = within(getByTestId('node-type-autocomplete')).getByRole(
    'textbox',
  );
  selectAutocompleteItem(autocomplete, 'DN');
  expect(mockUpdateTopology).toHaveBeenCalledWith({
    nodes: [
      {
        mac_addr: '',
        name: 'MyNode',
        nodeType: {
          label: 'DN',
          node_type: 2,
          pop_node: false,
        },
        node_type: 1,
        pop_node: false,
        site_name: 'MySiteName',
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
