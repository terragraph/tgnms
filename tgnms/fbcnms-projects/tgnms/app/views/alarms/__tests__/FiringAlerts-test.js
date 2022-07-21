/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

/*
 * Test TGNMS integration with alarms
 */

import * as React from 'react';
import NmsAlarms from '../NmsAlarms';
import {AlarmsTestWrapper} from '@fbcnms/alarms/test/testHelpers';
import {EventIdValueMap} from '@fbcnms/tg-nms/shared/types/Event';
import {TgApiUtil as TgApiUtilMock} from '../TgAlarmApi';
import {act, fireEvent, render, waitFor} from '@testing-library/react';

import type {FiringAlarm} from '@fbcnms/alarms/components/AlarmAPIType';

jest.mock('../TgAlarmApi', () => {
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

const commonProps = {
  networkName: 'test',
};

test('Firing alerts tab renders', async () => {
  const firingAlerts: Array<FiringAlarm> = [
    {
      labels: {alertname: '<<testalert>>', severity: 'NOTICE'},
      annotations: {},
      endsAt: '',
      receivers: [],
      startsAt: '',
      updatedAt: '',
      fingerprint: '',
      status: {inhibitedBy: [], silencedBy: [], state: ''},
    },
  ];
  jest.spyOn(TgApiUtilMock, 'viewFiringAlerts').mockReturnValue(firingAlerts);
  const {getByText} = render(
    <AlarmsTestWrapper>
      <NmsAlarms {...commonProps} />
    </AlarmsTestWrapper>,
  );
  expect(getByText('<<testalert>>')).toBeInTheDocument();
  expect(getByText(/notice/i)).toBeInTheDocument();
});

test('Clicking view alert shows alert details', async () => {
  const firingAlerts: Array<FiringAlarm> = [
    {
      labels: {alertname: '<<testalert>>', severity: 'NOTICE'},
      annotations: {},
      endsAt: '',
      receivers: [],
      startsAt: '',
      updatedAt: '',
      fingerprint: '',
      status: {inhibitedBy: [], silencedBy: [], state: ''},
    },
  ];
  jest.spyOn(TgApiUtilMock, 'viewFiringAlerts').mockReturnValue(firingAlerts);
  const {getByText, getByTestId} = render(
    <AlarmsTestWrapper>
      <NmsAlarms {...commonProps} />
    </AlarmsTestWrapper>,
    {baseElement: document?.body ?? undefined},
  );

  act(() => {
    fireEvent.click(getByText('<<testalert>>'));
  });

  const detailsPane = await waitFor(() => getByTestId('alert-details-pane'));
  expect(detailsPane).toBeInTheDocument();
});

xtest('Clicking view alert on an event alert shows the EventAlertViewer', async () => {
  const alertViewerMock = jest.spyOn(
    require('../eventalarms/EventAlertViewer'),
    'default',
  );
  const firingAlerts: Array<FiringAlarm> = [
    {
      labels: {alertname: '<<testalert>>', severity: 'NOTICE'},
      annotations: {eventId: EventIdValueMap.GPS_SYNC.toString(), events: '[]'},
      endsAt: '',
      receivers: [],
      startsAt: '',
      updatedAt: '',
      fingerprint: '',
      status: {inhibitedBy: [], silencedBy: [], state: ''},
    },
  ];
  jest
    .spyOn(TgApiUtilMock, 'viewFiringAlerts')
    .mockReturnValueOnce(firingAlerts);
  const {getByText, getByLabelText, getByTestId} = render(
    <AlarmsTestWrapper>
      <NmsAlarms {...commonProps} />
    </AlarmsTestWrapper>,
    {baseElement: document?.body ?? undefined},
  );
  act(() => {
    fireEvent.click(getByLabelText(/action menu/i));
  });
  act(() => {
    fireEvent.click(getByText(/view/i));
  });
  const alertTitle = await waitFor(() => getByTestId('alert-details-pane'));
  expect(alertTitle).toBeInTheDocument();
  expect(alertViewerMock).toHaveBeenCalled();
});
