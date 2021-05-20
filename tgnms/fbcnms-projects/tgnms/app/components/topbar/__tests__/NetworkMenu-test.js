/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {NetworkListContextType} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';

import * as React from 'react';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import NetworkMenu from '../NetworkMenu';
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

describe('Network Menu', () => {
  test('does not appear until clicked', () => {
    const {getByTestId} = renderWithRouter(
      <NetworkMenuWrapper>
        <NetworkMenu />
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
        <NetworkMenu />
      </NetworkMenuWrapper>,
    );
    expect(document.getElementById('networks-appbar')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('toggle-networks-menu'));
    expect(getByText('Network A')).toBeInTheDocument();
    expect(getByText('Network B')).toBeInTheDocument();
  });
});

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
