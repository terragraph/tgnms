/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {ANPFileHandle, ANPPlan} from '@fbcnms/tg-nms/shared/dto/ANP';

export function mockANPPlan(overrides?: $Shape<ANPPlan>): $Shape<ANPPlan> {
  return {
    id: '1',
    plan_name: 'test plan',
    plan_status: PLAN_STATUS.SUCCEEDED,
    ...(overrides ?? {}),
  };
}

export function mockANPFile(
  overrides?: $Shape<ANPFileHandle>,
): $Shape<ANPFileHandle> {
  return {
    file_name: 'test',
    file_extension: '.txt',
    file_role: '',
    file_status: '',
    id: '1',
    ...(overrides ?? {}),
  };
}
