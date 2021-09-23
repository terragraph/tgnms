/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
