/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as fs from 'fs';
import * as path from 'path';
const logger = require('../log')(module);

const PATHS = {
  SCHEMA: 'hwprofile-schema.json',
  PROFILES_DIR: 'profiles',
  DEFAULT: 'default.json',
};

export function getSchema(): ?string {
  const hwProfileDir = getHwProfileDir();
  const schemaPath = path.join(hwProfileDir, PATHS.SCHEMA);
  const fileData = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(fileData);
}

/**
 * Read the hardware profiles from disk
 */
export async function loadProfiles(): Promise<Array<Object>> {
  const hwProfileDir = getHwProfileDir();
  const profilesDir = path.join(hwProfileDir, PATHS.PROFILES_DIR);
  const profiles = [];
  for (const f of fs.readdirSync(profilesDir)) {
    const fileData = fs.readFileSync(path.join(profilesDir, f), 'utf-8');
    const p = JSON.parse(fileData);
    profiles.push(p);
  }
  return profiles;
}

function getHwProfileDir() {
  const envVar = process.env['HW_PROFILES_BASE_DIR'];
  if (envVar == null || envVar.trim() === '') {
    const nodeEnv = process.env['NODE_ENV'];
    if (nodeEnv === 'test' || nodeEnv === 'development') {
      logger.warn('dev only: falling back to hard-coded hwprofile directory');
      /**
       * Relative path to the hwprofiles directory (in the repo)
       * This should only be used during development/testing and provided via
       * env in prod.
       */
      const HW_PROFILE_SOURCE_PATH_RELATIVE = path.join(
        __dirname,
        // nms_stack/nms_cli/nms_stack/roles/hwprofiles/files
        '../../../../../nms_stack/nms_cli/nms_stack/roles/hwprofiles/files',
      );
      return HW_PROFILE_SOURCE_PATH_RELATIVE;
    } else {
      throw new Error('Missing HW_PROFILES_BASE_DIR env-var');
    }
  }
  return path.resolve(envVar);
}
