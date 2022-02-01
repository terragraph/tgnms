/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  ANPFileHandle,
  ANPPlan,
  ANPPlanMetrics,
} from '@fbcnms/tg-nms/shared/dto/ANP';

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
    file_extension: 'txt',
    file_role: FILE_ROLE.BOUNDARY_FILE,
    file_status: '',
    id: '1',
    ...(overrides ?? {}),
  };
}

export function mockANPPlanMetrics(): ANPPlanMetrics {
  const fs = require('fs');
  const path = require('path');
  const json = fs.readFileSync(
    path.resolve(path.join(__dirname, 'planning_data/ANPPlanMetrics.json')),
    'utf8',
  );
  return JSON.parse(json);
}
