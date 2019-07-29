/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import MaterialTopBar from '../MaterialTopBar';
import NetworkListContext from '../../../NetworkListContext';
import {
  TestApp,
  initWindowConfig,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent} from '@testing-library/react';
import type {NetworkConfig} from '../../../NetworkContext';
import type {NetworkListContextType} from '../../../NetworkListContext';

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
  test('GRAFANA_URL shows/hides Dashboards', () => {
    let result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByText('Dashboards')).not.toBeInTheDocument();
    initWindowConfig({
      env: {
        GRAFANA_URL: 'example.com',
      },
    });
    result = renderWithRouter(
      <TestApp>
        <MaterialTopBar />
      </TestApp>,
    );
    expect(result.queryByText('Dashboards')).toBeInTheDocument();
  });

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
    return (
      <TestApp {...props}>
        <NetworkListContext.Provider
          value={{
            waitForNetworkListRefresh: () => {},
            getNetworkName: () => '',
            // changeNetworkName is a terrible name for what this actually does
            changeNetworkName: name => name,
            networkList: {},
            ...(listContextValue || {}),
          }}>
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

// big giant mock network config to make flow happy
function mockNetworkConfig(
  overrides?: $Shape<NetworkConfig>,
): $Shape<NetworkConfig> {
  const mockCtrl = {
    api_port: 8080,
    controller_online: true,
    e2e_port: 8080,
    id: 1,
    ip: '::',
  };
  const mockLocation = {
    accuracy: 0,
    altitude: 0,
    latitude: 0,
    longitude: 0,
  };
  const config: $Shape<NetworkConfig> = {
    controller_online: true,
    controller_version: '',
    id: 1,
    high_availability: {
      primary: {
        peerExpiry: 1000,
        state: 0,
      },
    },
    ignition_state: {
      igCandidates: [],
      igParams: {
        enable: true,
        linkAutoIgnite: {},
        linkUpDampenInterval: 0,
        linkUpInterval: 0,
      },
      lastIgCandidates: [],
    },
    backup: mockCtrl,
    primary: mockCtrl,
    query_service_online: true,
    site_overrides: {
      name: '',
      location: mockLocation,
    },
    status_dump: {
      statusReports: {},
      timeStamp: 0,
    },
    upgrade_state: {
      curBatch: [],
      pendingBatches: [],
      curReq: {
        ugType: 'NODES',
        nodes: [],
        excludeNodes: [],
        urReq: {
          urType: 'PREPARE_UPGRADE',
          upgradeReqId: '',
          md5: '',
          imageUrl: '',
          scheduleToCommit: 0,
          downloadAttempts: 0,
          torrentParams: {
            downloadTimeout: 0,
          },
        },
        timeout: 0,
        skipFailure: true,
        version: '',
        skipLinks: [],
        limit: 0,
        retryLimit: 0,
      },
      pendingReqs: [],
    },
    topology: {
      name: '',
      nodes: [],
      links: [],
      sites: [],
      config: {channel: 0},
    },
    offline_whitelist: {
      links: new Map(),
      nodes: new Map(),
    },
  };
  if (typeof overrides === 'object') {
    Object.assign(config, overrides);
  }
  return config;
}
