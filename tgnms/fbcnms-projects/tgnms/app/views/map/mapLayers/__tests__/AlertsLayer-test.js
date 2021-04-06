/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AlertsLayer from '../AlertsLayer';
import {
  NetworkContextWrapper,
  TestApp,
  mockTopology,
} from '../../../../tests/testHelpers';
import {Popup} from 'react-mapbox-gl';
import {TgApiUtil as TgApiUtilMock} from '../../../alarms/TgAlarmApi';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkConfig} from '../../../../tests/data/NetworkConfig';

import type {FiringAlarm} from '@fbcnms/alarms/components/AlarmAPIType';

jest.mock('../../../alarms/TgAlarmApi', () => {
  const mockApiUtil = require('@fbcnms/alarms/test/testHelpers').mockApiUtil;
  return {
    TgApiUtil: mockApiUtil(),
    TgEventAlarmsApiUtil: {
      getRules: jest.fn(),
      createAlertRule: jest.fn(),
      deleteAlertRule: jest.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
});

test('renders with default props', () => {
  const firingAlerts: Array<FiringAlarm> = [
    {
      labels: {
        alertname: '<<testalert>>',
        severity: 'NOTICE',
        nodeName: 'node1',
      },
      annotations: {},
      endsAt: '',
      receivers: [],
      startsAt: '',
      updatedAt: '',
      fingerprint: '',
      status: {inhibitedBy: [], silencedBy: [], state: 'active'},
    },
  ];
  jest.spyOn(TgApiUtilMock, 'viewFiringAlerts').mockReturnValue(firingAlerts);

  const topology = mockTopology();
  topology.__test.addSite({
    name: 'site1',
    location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
  });
  topology.__test.addNode({
    name: 'node1',
    site_name: 'site1',
  });

  render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkName: 'testNetworkName',
          siteMap: {
            site1: {
              name: 'site1',
              location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
            },
          },
          networkConfig: mockNetworkConfig({topology}),
        }}>
        <AlertsLayer />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(Popup).toHaveBeenCalled();
});
