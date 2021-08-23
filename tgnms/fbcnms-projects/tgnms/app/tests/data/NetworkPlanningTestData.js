/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {
  FILE_SOURCE,
  NETWORK_PLAN_STATE,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {
  InputFile,
  NetworkPlan,
  PlanFolder,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export function mockNetworkFolder(
  overrides?: $Shape<PlanFolder>,
): $Shape<PlanFolder> {
  return {
    id: 1,
    name: 'test folder',
    ...(overrides ?? {}),
  };
}

export function mockNetworkPlan(
  overrides?: $Shape<NetworkPlan>,
): $Shape<NetworkPlan> {
  return {
    id: 1,
    folderId: 1,
    name: 'test plan',
    state: NETWORK_PLAN_STATE.SUCCESS,
    dsmFile: null,
    boundaryFile: null,
    sitesFile: null,
    ...(overrides ?? {}),
  };
}

export function mockInputFile(
  overrides?: $Shape<InputFile>,
): $Shape<InputFile> {
  return {
    name: 'test',
    source: FILE_SOURCE.local,
    role: '',
    id: 1,
    ...(overrides ?? {}),
  };
}
