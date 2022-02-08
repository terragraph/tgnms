/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as fs from 'fs';
import * as path from 'path';
import {ANP_FILE_DIR} from '@fbcnms/tg-nms/server/config';
import {constants as FS_CONSTANTS} from 'fs';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';

export function getBaseDir() {
  return path.resolve(ANP_FILE_DIR);
}

export function getInputFilePath({
  file,
}: {
  file: NetworkPlanFileAttributes | InputFile,
}) {
  const inputFilesDir = path.join(getBaseDir(), 'inputs');
  const fileName = `${file.id}-${file.name}`;

  return path.join(inputFilesDir, fileName);
}

/**
 * wrapping the callback apis because neither memfs nor the flow-version
 * we use supports fs/promises
 */
// Check if a file or directory exists and is readable and writable
export async function checkPathExists(path: string): Promise<boolean> {
  const exists = await new Promise(res => {
    fs.access(
      path,
      FS_CONSTANTS.F_OK | FS_CONSTANTS.R_OK | FS_CONSTANTS.W_OK,
      err => {
        if (err) {
          return res(false);
        }
        return res(true);
      },
    );
  });
  return exists;
}

export async function makeANPDir(dir: string): Promise<string> {
  const fullPath = path.join(getBaseDir(), dir);
  const dirExists = await checkPathExists(fullPath);
  if (!dirExists) {
    await new Promise((res, rej) => {
      fs.mkdir(fullPath, {recursive: true}, err => {
        if (err) {
          return rej(err);
        }
        return res();
      });
    });
  }
  return dir;
}
