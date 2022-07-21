/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {NetworkListContextType} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';

import * as React from 'react';
import MaterialTopBar from '../MaterialTopBar';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import {
  TestApp,
  initWindowConfig,
  mockNetworkInstanceConfig,
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
      <MaterialTopBar />
    </TestApp>,
  );
  expect(getByText('Terragraph NMS')).toBeInTheDocument();
});

describe('Drawer feature flags', () => {
  test('NOTIFICATION_MENU_ENABLED shows/hides NotificationMenu', () => {
    let result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByTestId('menu-toggle')).not.toBeInTheDocument();
    initWindowConfig({
      featureFlags: {
        NOTIFICATION_MENU_ENABLED: true,
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByTestId('menu-toggle')).toBeInTheDocument();
  });
});

describe('Network Menu', () => {
  function NetworkMenuWrapper({
    children,
    listContextValue,
    ...props
  }: {
    children: React.Element<any>,
    listContextValue?: $Shape<NetworkListContextType>,
  }) {
    const value: NetworkListContextType = {
      waitForNetworkListRefresh: () => {},
      getNetworkName: () => '',
      // changeNetworkName is a terrible name for what this actually does
      changeNetworkName: name => name,
      networkList: ({}: $Shape<NetworkList>),
      ...listContextValue,
    };
    return (
      <TestApp {...props}>
        <NetworkListContext.Provider value={value}>
          {children}
        </NetworkListContext.Provider>
      </TestApp>
    );
  }

  test('does not appear until clicked', () => {
    const {getByTestId} = renderWithRouter(
      <NetworkMenuWrapper>
        <MaterialTopBar />
      </NetworkMenuWrapper>,
    );
    expect(document.getElementById('networks-appbar')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-networks-menu'));
    expect(document.getElementById('networks-appbar')).toBeInTheDocument();
  });

  test('shows all networks in the context', () => {
    const {getByTestId, getByText} = renderWithRouter(
      <NetworkMenuWrapper
        listContextValue={{
          networkList: {
            'Network A': mockNetworkInstanceConfig(),
            'Network B': mockNetworkInstanceConfig(),
          },
        }}>
        <MaterialTopBar />
      </NetworkMenuWrapper>,
    );
    expect(document.getElementById('networks-appbar')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-networks-menu'));
    expect(getByText('Network A')).toBeInTheDocument();
    expect(getByText('Network B')).toBeInTheDocument();
  });
});

describe('About modal', () => {
  test('renders about modal when commit vars set', () => {
    initWindowConfig({
      env: {
        COMMIT_DATE: '2020.01.01',
        COMMIT_HASH: 'fdfdsfsdff',
      },
    });
    const {getByText, getByTestId, queryByTestId} = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(getByText('Help')).toBeInTheDocument();
    expect(queryByTestId('about-modal')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-help-menu'));
    fireEvent.click(getByTestId('toggle-about-modal'));
    expect(queryByTestId('about-modal')).toBeInTheDocument();
  });

  test('does not render about modal when commit vars not set', () => {
    const {getByTestId, queryByTestId} = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    fireEvent.click(getByTestId('toggle-help-menu'));
    expect(queryByTestId('about-modal')).not.toBeInTheDocument();
  });
});
