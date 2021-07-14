/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

const fs = require('fs');
const path = require('path');

export function mockUploadANPJson(): string {
  const filePath = path.resolve(__dirname, 'topology_data/ANP.json');
  const data = fs.readFileSync(filePath, {encoding: 'utf8'});
  return data;
}

export function mockUploadANPKml(): string {
  const filePath = path.resolve(__dirname, 'topology_data/ANP.kml');
  const data = fs.readFileSync(filePath, {encoding: 'utf8'});
  return data;
}

export function mockUploadTGJson(): string {
  const filePath = path.resolve(__dirname, 'topology_data/TG.json');
  const data = fs.readFileSync(filePath, {encoding: 'utf8'});
  return data;
}
