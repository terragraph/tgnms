/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {NetworkListContextType} from '../../../contexts/NetworkListContext';

import 'jest-dom/extend-expect';
import * as React from 'react';
import MaterialTopBar from '../MaterialTopBar';
import NetworkListContext from '../../../contexts/NetworkListContext';
import {
  TestApp,
  initWindowConfig,
  mockNetworkConfig,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent} from '@testing-library/react';

beforeEach(() => {
  initWindowConfig({env: {}});
});

afterEach(cleanup);

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
      env: {
        NOTIFICATION_MENU_ENABLED: 'true',
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByTestId('menu-toggle')).toBeInTheDocument();
  });

  test('NETWORKTEST_HOST shows/hides Network Tests', () => {
    let result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByText('Network Tests')).not.toBeInTheDocument();
    initWindowConfig({
      env: {
        NETWORKTEST_HOST: 'example.com',
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.getByText('Network Tests')).toBeInTheDocument();
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
      networkList: {},
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
            'Network A': mockNetworkConfig(),
            'Network B': mockNetworkConfig(),
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
