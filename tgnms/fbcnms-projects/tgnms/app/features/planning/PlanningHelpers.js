/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {ANP_STATUS_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';

export type EnabledStatusTypes = {|[$Keys<typeof ANP_STATUS_TYPE>]: boolean|};
export type MapOptionsState = {|
  enabledStatusTypes: EnabledStatusTypes,
|};

export function suggestVersionedName(name: string): string {
  const matches = name.match(/^(.*)([vV])(\d+)$/);
  if (matches == null) {
    return `${name.trim()} V2`;
  }
  const [_match, prefix, v, num] = matches;
  const parsed = parseInt(num);
  const incremented = !isNaN(parsed) ? parsed + 1 : 1;
  return `${prefix}${v}${incremented}`;
}

export function isFinalState(status: string): boolean {
  const finalStates = new Set([
    PLAN_STATUS.FAILED,
    PLAN_STATUS.SUCCEEDED,
    PLAN_STATUS.KILLED,
  ]);
  return finalStates.has(status);
}

export function isLaunchedState(status: string): boolean {
  const launchedStates = new Set([PLAN_STATUS.RUNNING, PLAN_STATUS.SCHEDULED]);
  return launchedStates.has(status);
}

export function getEnabledStatusKeys(enabledStatusTypes: EnabledStatusTypes) {
  /**
   * EnabledStatusTypes maps from status type key->boolean. Convert this to a
   * set of enabled status types
   */
  const lookup = new Set<number>();
  for (const [key, enabled] of objectEntriesTypesafe(enabledStatusTypes)) {
    if (enabled) {
      lookup.add(ANP_STATUS_TYPE[key]);
    }
  }
  return lookup;
}
