/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {
  FILE_SOURCE,
  NETWORK_PLAN_STATE,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {
  InputFile,
  NetworkPlan,
  PlanFolder,
  SitesFile,
  SitesFileRow,
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
    role: FILE_ROLE.BOUNDARY_FILE,
    id: 1,
    ...(overrides ?? {}),
  };
}

export function mockSitesFile() {
  const f: SitesFile = {
    id: 1,
    sites: [
      mockSitesFileRow({
        id: 0,
        type: 'POP',
        name: 'POP-1',
      }),
      mockSitesFileRow({
        id: 1,
        type: 'CN',
        name: 'CN-1',
      }),
      mockSitesFileRow({
        id: 2,
        type: 'DN',
        name: 'DN-1',
      }),
    ],
  };
  return f;
}

export function mockSitesFileRow(overrides?: $Shape<SitesFileRow>) {
  const location = {latitude: 0, longitude: 0, altitude: 0, accuracy: 0};
  return {
    id: 0,
    type: 'DN',
    location,
    name: 'DN',
    ...(overrides ?? {}: $Shape<SitesFileRow>),
  };
}
