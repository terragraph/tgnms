/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

const fs = require('fs');
const path = require('path');

export function mockUploadANPJson(
  dirname: string = __dirname,
  file: string = 'topology_data/ANP.json',
): string {
  const filePath = path.resolve(dirname, file);
  const data = fs.readFileSync(filePath, {encoding: 'utf8'});
  return data;
}

export function mockUploadANPKml(
  dirname: string = __dirname,
  file: string = 'topology_data/ANP.kml',
): string {
  const filePath = path.resolve(dirname, file);
  const data = fs.readFileSync(filePath, {encoding: 'utf8'});
  return data;
}

export function mockUploadTGJson(
  dirname: string = __dirname,
  file: string = 'topology_data/TG.json',
): string {
  const filePath = path.resolve(dirname, file);
  const data = fs.readFileSync(filePath, {encoding: 'utf8'});
  return data;
}
