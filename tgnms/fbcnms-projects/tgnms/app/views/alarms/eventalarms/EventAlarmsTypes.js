/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * Alarm rule for the event alarms service:
 *  connectivity-lab/terragraph/nms/alarms
 */

import {
  EventIdValueMap,
  EventLevelValueMap,
} from '@fbcnms/tg-nms/shared/types/Event';
import type {EventType} from '@fbcnms/tg-nms/shared/types/Event';

export const Severity = {
  OFF: 'OFF',
  INFO: 'INFO',
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
  CRITICAL: 'CRITICAL',
};

export const Type = {
  NORMAL: 'NORMAL',
  HIDDEN: 'HIDDEN',
  AGGREGATION: 'AGGREGATION',
};

export type EventAlarm = {
  id: string,
  creationTime: number,
  ruleName: string,
  severity: $Values<typeof Severity>,
  entity: string,
  events: Array<EventType>,
  alarmType: $Values<typeof Type>,
};

export type EventRule = {|
  name: string,
  description: string,
  eventId: $Values<typeof EventIdValueMap>,
  options: EventRuleOptions,
  severity: $Values<typeof Severity>,
  extraLabels: {},
  extraAnnotations: {},
|};

export type EventRuleOptions = {
  raiseOnLevel: Array<$Keys<typeof EventLevelValueMap>>,
  clearOnLevel: Array<$Keys<typeof EventLevelValueMap>>,
  raiseDelay: number,
  clearDelay: number,
  aggregation: number,
  eventFilter: Array<string>,
  attributeFilter: Array<{}>,
};
