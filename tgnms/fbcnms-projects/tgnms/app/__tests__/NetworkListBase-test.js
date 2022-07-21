/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NetworkListBase from '../NetworkListBase';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import {
  TestApp,
  initWindowConfig,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent} from '@testing-library/react';

import type {NetworkList} from '@fbcnms/tg-nms/shared/dto/NetworkState';

beforeEach(() => {
  initWindowConfig();
});

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkListBase />
    </TestApp>,
  );
  expect(getByText('Terragraph NMS')).toBeInTheDocument();
});

describe('network Drawer', () => {
  test('renders on load', () => {
    const {getByText} = renderWithRouter(
      <TestApp>
        <NetworkListBase />
      </TestApp>,
    );
    expect(getByText('Map')).toBeInTheDocument();
  });
});

describe('Network Menu', () => {
  const NetworkListMock = {
    waitForNetworkListRefresh: () => {},
    getNetworkName: () => '',
    // changeNetworkName is a terrible name for what this actually does
    changeNetworkName: name => name,
    networkList: ({}: $Shape<NetworkList>),
  };

  test('network menu renders initially', () => {
    const {getByTestId} = renderWithRouter(
      <TestApp>
        <NetworkListContext.Provider value={NetworkListMock}>
          <NetworkListBase />
        </NetworkListContext.Provider>
      </TestApp>,
    );
    expect(getByTestId('toggle-networks-menu')).toBeInTheDocument();
  });

  test('does not appear until clicked', () => {
    const {getByTestId} = renderWithRouter(
      <TestApp>
        <NetworkListContext.Provider value={NetworkListMock}>
          <NetworkListBase />
        </NetworkListContext.Provider>
      </TestApp>,
    );
    expect(document.getElementById('networks-appbar')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-networks-menu'));
    expect(document.getElementById('networks-appbar')).toBeInTheDocument();
  });
});
