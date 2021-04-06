/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import AddLinkPanel from '../AddLinkPanel';
import nullthrows from '@fbcnms/util/nullthrows';
import {TestApp} from '../../../../tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {mockMultiHop} from '../../../../tests/data/NetworkConfig';
import type {Props} from '../AddLinkPanel';

jest.mock('sweetalert2');
const commonProps: $Shape<Props> = {
  expanded: true,
  initialParams: {},
  networkName: 'test',
  onPanelChange: jest.fn(),
  onClose: jest.fn(),
};

function setLinkParams(
  node1: string,
  node2: string,
  link_type: 'wireless' | 'ethernet',
) {
  act(() => {
    fireEvent.change(
      nullthrows(document.getElementById('linkNode1')?.querySelector('input')),
      {
        target: {value: node1},
      },
    );
    fireEvent.change(
      nullthrows(document.getElementById('linkNode2')?.querySelector('input')),
      {
        target: {value: node2},
      },
    );
    fireEvent.change(
      nullthrows(document.getElementById('link_type')?.querySelector('input')),
      {
        target: {value: link_type},
      },
    );
  });
}

it('test that a PoP exists', () => {
  const spy = jest.spyOn(require('sweetalert2'), 'default');
  const topology = mockMultiHop(4, false); // 4 hops and no PoP
  const props = {...commonProps, topology};
  const {getByTestId} = render(
    <TestApp>
      <AddLinkPanel {...props} />
    </TestApp>,
  );
  const {nodes} = topology;
  setLinkParams(nodes[0].name, nodes[nodes.length - 1].name, 'wireless');
  fireEvent.click(getByTestId('add-link-button'));
  expect(spy).toHaveBeenCalledTimes(1);
});

it('test max hop limitation exceeded', () => {
  const spy = jest.spyOn(require('sweetalert2'), 'default');
  const topology = mockMultiHop(12, true); // 12 hops
  const props = {...commonProps, topology};
  const {getByTestId} = render(
    <TestApp>
      <AddLinkPanel {...props} />
    </TestApp>,
  );
  const {nodes} = topology;
  setLinkParams(
    nodes[0].name /* PoP node */,
    nodes[nodes.length - 1].name,
    'wireless',
  );
  fireEvent.click(getByTestId('add-link-button'));
  expect(spy).toHaveBeenCalledTimes(1);
});
