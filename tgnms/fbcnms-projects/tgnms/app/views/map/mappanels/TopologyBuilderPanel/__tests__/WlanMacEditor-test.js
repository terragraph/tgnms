/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import WlanMacEditor from '../WlanMacEditor';
import {TestApp, mockNode} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

const defaultProps = {
  index: 0,
  wlan_mac: '',
  wlan_mac_addrs: [],
  onUpdate: jest.fn(),
  nodeName: 'testNode',
};

jest.mock('@fbcnms/tg-nms/app/contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
    networkConfig: mockNetworkConfig(),
    macToNodeMap: {
      'aa:aa:aa:aa:aa': 'testNode',
    },
    nodeMap: {
      testNode: mockNode(),
    },
  }),
}));

test('render without crashing', () => {
  const {getByLabelText} = render(
    <TestApp>
      <WlanMacEditor {...defaultProps} />
    </TestApp>,
  );
  expect(getByLabelText('Radio MAC Address 1')).toBeInTheDocument();
});

test('change calls onChange', () => {
  const {getByTestId} = render(
    <TestApp>
      <WlanMacEditor {...defaultProps} />
    </TestApp>,
  );
  fireEvent.change(getByTestId('wlan-mac').children[1].children[1], {
    target: {value: 10},
  });
  expect(defaultProps.onUpdate).toHaveBeenCalled();
});
