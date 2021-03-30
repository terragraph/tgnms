/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import EventAlertViewer from '../EventAlertViewer';
import {
  EventCategoryValueMap,
  EventIdValueMap,
  EventLevelValueMap,
} from '../../../../../shared/types/Event';
import {alarmTestUtil} from '@fbcnms/alarms/test/testHelpers';
import {mockAlert} from '@fbcnms/alarms/test/testData';
import {render} from '@testing-library/react';

import type {EventType} from '../../../../../shared/types/Event';
import type {FiringAlarm} from '@fbcnms/alarms/components/AlarmAPIType';

const {AlarmsWrapper} = alarmTestUtil();

const defaultAlert: FiringAlarm = mockAlert({
  labels: {
    alertname: 'event alert',
    severity: 'WARNING',
    network: 'test network',
    entity: 'ab:cd:00:00:00:00',
  },
  annotations: {
    description: 'alert description',
    eventId: EventIdValueMap.GPS_SYNC.toString(),
    events: JSON.stringify([mockEvent()]),
  },
});

test('renders alert details', () => {
  const {getByTestId, getByText} = render(
    <AlarmsWrapper>
      <EventAlertViewer alert={defaultAlert} />
    </AlarmsWrapper>,
  );
  expect(getByTestId('event-alert-viewer')).toBeInTheDocument();
  expect(getByText('alert description')).toBeInTheDocument();
});

test('renders events', () => {
  const {getByText} = render(
    <AlarmsWrapper>
      <EventAlertViewer alert={defaultAlert} />
    </AlarmsWrapper>,
  );
  // check for event reason
  expect(
    getByText('GPS is not in sync (38:3a:21:b0:09:b3)'),
  ).toBeInTheDocument();
  // check for nodename
  expect(getByText(/terra422.f5.tg.a404-if/i)).toBeInTheDocument();
});

function mockEvent(): EventType {
  return {
    source: 'minion-app-STATUS_APP',
    timestamp: 1582752137,
    reason: 'GPS is not in sync (38:3a:21:b0:09:b3)',
    details: JSON.stringify({
      mac: '38:3a:21:b0:09:b3',
      sync: false,
    }),
    category: EventCategoryValueMap.STATUS,
    level: EventLevelValueMap.ERROR,
    entity: '38:3a:21:b0:09:b3',
    nodeId: '38:3a:21:b0:09:b3',
    eventId: EventIdValueMap.GPS_SYNC,
    topologyName: 'tower G',
    nodeName: 'terra422.f5.tg.a404-if',
  };
}
