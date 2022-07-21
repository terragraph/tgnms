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
import AlertsLayer from '../AlertsLayer';
import {
  NetworkContextWrapper,
  TestApp,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {Popup} from 'react-mapbox-gl';
import {TgApiUtil as TgApiUtilMock} from '../../../alarms/TgAlarmApi';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

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
