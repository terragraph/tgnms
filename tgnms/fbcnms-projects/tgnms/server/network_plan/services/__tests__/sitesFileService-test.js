/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {Buffer} from 'buffer';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {FILE_SOURCE, FILE_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {vol} from 'memfs';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';

const {network_plan_file} = require('@fbcnms/tg-nms/server/models');
jest.mock('../../../models');
jest.doMock('fs', () => {
  const {vol, createFsFromVolume} = require('memfs');
  return createFsFromVolume(vol);
});
const fs = require('fs');
const {
  writeInputFile,
  expectFileExists,
} = require('@fbcnms/tg-nms/server/network_plan/__testhelpers/planning-testhelpers');
const {makeANPDir, getInputFilePath} = require('../../files');
import type SitesFileService from '@fbcnms/tg-nms/server/network_plan/services/sitesFileService';

const EXAMPLE_CSV_STRING = `name,lon,lat,height,type
site1,5,5,5,DN
site2,10,10,5,CN
site3,11,11,10,POP
`;
// this is what the parsed EXAMPLE_CSV_STRING should look like
const EXAMPLE_SITESFILE_OBJECT = {
  sites: [
    {
      name: 'site1',
      location: {longitude: 5, latitude: 5, altitude: 5},
      type: 'DN',
    },
    {
      name: 'site2',
      location: {longitude: 10, latitude: 10, altitude: 5},
      type: 'CN',
    },
    {
      name: 'site3',
      location: {longitude: 11, latitude: 11, altitude: 10},
      type: 'POP',
    },
  ],
};
let sitesFileService: SitesFileService = createService();
beforeEach(() => {
  sitesFileService = createService();
  vol.reset();
});

describe('getFile', () => {
  test('if the file does not exist, throws an error', async () => {
    await expect(async () => {
      await sitesFileService.getFile({id: 5});
    }).rejects.toThrow('File not found');
  });
  test('fetches the file from disk and converts it to the SitesFile format', async () => {
    const inputFile = await seedInputFile();
    await makeANPDir('inputs');
    writeInputFile(inputFile, Buffer.from(EXAMPLE_CSV_STRING));
    const sitesFile = await sitesFileService.getFile({id: 10});
    expect(sitesFile).toMatchObject(EXAMPLE_SITESFILE_OBJECT);
  });

  test.each([
    ['empty', ''],
    ['no headers', `site2,10,10,5,CN`],
    [
      'wrong headers',
      `kitten,bunny,puppy,lat,lon
site1,4,5,5,3`,
    ],
    [
      'incorrect row length',
      `name,lon,lat,height,type
    site2,10,10,5,CN
    site1,5
    site2,10,10,5,CN
    site3,11,11,10,POP
    `,
    ],
  ])('throws error for malformed files: %s', async ([_, filedata]) => {
    const inputFile = await seedInputFile();
    await makeANPDir('inputs');
    writeInputFile(inputFile, Buffer.from(filedata));
    await expect(async () => {
      await sitesFileService.getFile({id: 10});
    }).rejects.toThrow();
  });
});

describe('createFile', () => {
  test('creates a CSV file on-disk with only headers', async () => {
    const inputFile = await sitesFileService.createFile({name: 'sites.csv'});
    const filePath = getInputFilePath({file: inputFile});
    expectFileExists(filePath, true);
    const fileData = fs.readFileSync(filePath).toString();
    expect(fileData).toBe('lat,lon,type,height,name\n');
  });

  test('throws an error if no name is provided', async () => {
    await expect(async () => {
      await sitesFileService.createFile({name: ''});
    }).rejects.toThrow();
  });
});

function createService() {
  const SitesFileServiceClass = require('../sitesFileService').default;
  return new SitesFileServiceClass();
}

async function seedInputFile() {
  const inputFile = (
    await network_plan_file.create(
      ({
        id: 10,
        name: 'sites.csv',
        source: FILE_SOURCE.local,
        role: FILE_ROLE.URBAN_SITE_FILE,
        state: FILE_STATE.ready,
      }: $Shape<NetworkPlanFileAttributes>),
    )
  ).toJSON();
  return inputFile;
}
