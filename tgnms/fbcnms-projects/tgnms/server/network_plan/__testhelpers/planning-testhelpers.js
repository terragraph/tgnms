/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 *
 * @format
 * @flow
 */

import * as fs from 'fs';
import * as path from 'path';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {
  FILE_SOURCE,
  FILE_STATE,
  NETWORK_PLAN_STATE,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {getBaseDir} from '@fbcnms/tg-nms/server/network_plan/files';
const {
  network_plan,
  network_plan_file,
  network_plan_folder,
} = require('@fbcnms/tg-nms/server/models');

import type {FileSourceKey} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {NetworkPlanAttributes} from '@fbcnms/tg-nms/server/models/networkPlan';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';
import type {NetworkPlanFolderAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFolder';

export async function createInputFiles(defaults: ?{source?: FileSourceKey}) {
  const files = (
    await network_plan_file.bulkCreate([
      ({
        id: 10,
        name: 'boundary.kml',
        fbid: defaults?.source === FILE_SOURCE.fbid ? '10' : undefined,
        source: defaults?.source ?? FILE_SOURCE.local,
        role: FILE_ROLE.BOUNDARY_FILE,
        state: FILE_STATE.ready,
      }: $Shape<NetworkPlanFileAttributes>),
      ({
        id: 11,
        name: 'dsm.tiff',
        fbid: defaults?.source === FILE_SOURCE.fbid ? '11' : undefined,
        source: defaults?.source ?? FILE_SOURCE.local,
        role: FILE_ROLE.DSM_GEOTIFF,
        state: FILE_STATE.ready,
      }: $Shape<NetworkPlanFileAttributes>),
      ({
        id: 12,
        name: 'sites.csv',
        fbid: defaults?.source === FILE_SOURCE.fbid ? '12' : undefined,
        source: defaults?.source ?? FILE_SOURCE.local,
        role: FILE_ROLE.URBAN_SITE_FILE,
        state: FILE_STATE.ready,
      }: $Shape<NetworkPlanFileAttributes>),
    ])
  ).map<NetworkPlanFileAttributes>(x => x.toJSON());
  return files;
}

export function expectFileExists(path: string, exists: boolean = true) {
  try {
    expect(fs.existsSync(path)).toBe(exists);
  } catch (err) {
    throw new Error(
      `Expected path: ${path} to ${exists === false ? 'NOT ' : ''}exist`,
    );
  }
}

export async function createTestFolder({
  name,
  fbid,
}: {
  name: string,
  fbid?: string,
}) {
  const folder = await network_plan_folder.create(
    ({name, fbid: fbid ?? 'fbid1'}: $Shape<NetworkPlanFolderAttributes>),
  );
  return folder.toJSON();
}

export async function createTestPlan(
  plan: $Shape<NetworkPlanAttributes>,
): Promise<NetworkPlanAttributes> {
  const dbPlan = await network_plan.create(
    ({
      name: 'test',
      state: NETWORK_PLAN_STATE.DRAFT,
      ...plan,
    }: $Shape<NetworkPlanAttributes>),
  );
  return dbPlan.toJSON();
}

export function writeInputFile(
  inputFile: NetworkPlanFileAttributes,
  data: Buffer,
) {
  const filePath = path.join(
    getBaseDir(),
    'inputs',
    `${inputFile.id}-${inputFile.name}`,
  );
  fs.writeFileSync(filePath, data);
}
