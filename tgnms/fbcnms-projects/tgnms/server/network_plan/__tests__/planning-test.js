/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as path from 'path';
import ANPAPIClientMock from '../ANPAPIClient';
import nullthrows from '@fbcnms/util/nullthrows';
import request from 'supertest';
import {FILE_ROLE, PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {
  FILE_SOURCE,
  FILE_STATE,
  NETWORK_PLAN_STATE,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
import {vol} from 'memfs';

// this is a jest mock of the hwprofiles helpers used to read from disk
import * as hwprofilesMock from '../../hwprofile/hwprofile';
// this is a mock of the actual json data stored on disk
import {mockHardwareProfile} from '@fbcnms/tg-nms/shared/tests/mocks/hwprofiles-mock';

import type {FileSourceKey} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {HardwareProfile} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';
import type {NetworkPlanAttributes} from '@fbcnms/tg-nms/server/models/networkPlan';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';

const {
  network_plan_folder,
  network_plan,
  network_plan_file,
} = require('../../models');
jest.doMock('fs', () => {
  const {vol, createFsFromVolume} = require('memfs');
  return createFsFromVolume(vol);
});
const {
  expectFileExists,
  writeInputFile,
  createTestPlan,
  createTestFolder,
} = require('@fbcnms/tg-nms/server/network_plan/__testhelpers/planning-testhelpers');

// use require for helpers so mock isn't hoisted
const {getBaseDir, makeANPDir} = require('../files');
const {inputFileRowToInputFile} = require('../mappers');
const fsMock = require('fs');

// mock out hardware profiles stuff
jest.mock('../../hwprofile/hwprofile');
const loadProfilesMock = jest.spyOn(hwprofilesMock, 'loadProfiles');
loadProfilesMock.mockRejectedValue(new Error('mock profiles not loaded'));
// Mock out the ANPAPIClient and provide some mock implementations
jest.mock('../ANPAPIClient');
const mockPlanFBID = '9999';
const mockFileFBID = '12345';
const mockFileRole = FILE_ROLE.DSM_GEOTIFF;
const mockFile = {
  file_name: 'dsm',
  file_extension: 'tiff',
  file_role: mockFileRole,
  id: mockFileFBID,
};
const getFileMetadataMock = jest.fn().mockResolvedValue(mockFile);
const createFolderMock = jest.fn(({folder_name}) =>
  Promise.resolve({id: 12345, folder_name}),
);
const createPlanMock = jest.fn(() => Promise.resolve({id: mockPlanFBID}));
const cancelPlanMock = jest.fn(() => Promise.resolve({success: true}));
const launchPlanMock = jest.fn(() => Promise.resolve({success: true}));
const uploadFileMock = jest.fn(() => Promise.resolve(mockFile));
const createUploadSessionMock = jest.fn(() =>
  Promise.resolve({id: 'upload:abc123=?sig=abc123'}),
);
const updateFileMetadataMock = jest.fn(() => Promise.resolve(mockFile));
const uploadChunkMock = jest.fn(() => Promise.resolve({h: '123'}));
const getPlanMock = jest.fn(() => Promise.reject(new Error('Not implemented')));
const getInputFileMock = jest
  .fn()
  .mockReturnValueOnce({file_status: 'PENDING'})
  .mockReturnValueOnce({file_status: 'PENDING'})
  .mockReturnValue({file_status: 'READY'});
(ANPAPIClientMock: any).mockImplementation(() => ({
  getFileMetadata: getFileMetadataMock,
  createFolder: createFolderMock,
  launchPlan: launchPlanMock,
  createPlan: createPlanMock,
  cancelPlan: cancelPlanMock,
  uploadFile: uploadFileMock,
  createUploadSession: createUploadSessionMock,
  uploadChunk: uploadChunkMock,
  updateFileMetadata: updateFileMetadataMock,
  getPlan: getPlanMock,
  getInputFile: getInputFileMock,
}));

jest.mock('axios');
jest.mock('../../models');
jest.mock('../../config', () => ({
  ANP_API_URL: 'test',
  ANP_CLIENT_ID: 'test',
  ANP_CLIENT_SECRET: 'test',
  ANP_PARTNER_ID: 'test',
  ANP_FILE_DIR: 'data/anp',
  FACEBOOK_OAUTH_URL: 'test',
}));

beforeEach(() => {
  vol.reset();
});

describe('POST /folder', () => {
  test('Creates a new folder', async () => {
    const folderName = 'test folder';
    const shouldBeNull = await network_plan_folder.findOne({
      where: {name: folderName},
    });
    expect(shouldBeNull).toBeNull();
    await request(setupApp())
      .post(`/network_plan/folder`)
      .send({
        name: folderName,
      })
      .expect(200);
    expect(createFolderMock).toHaveBeenCalledWith({folder_name: folderName});
    const dbRow = await network_plan_folder.findOne({
      where: {name: folderName},
    });
    expect(dbRow).not.toBeNull();
  });
});
describe('PUT /folder/:id', () => {
  test('renames a folder', async () => {
    const originalName = 'test folder';
    const newName = 'test folder-renamed';
    const response = await request(setupApp())
      .post(`/network_plan/folder`)
      .send({
        name: originalName,
      })
      .expect(200);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: originalName,
    });
    // ensure the created db row matches what's returned by the api
    let dbRow = await network_plan_folder.findByPk(response.body.id);
    if (dbRow == null) {
      throw new Error('folder not created');
    }
    const createdfolder = dbRow.toJSON();
    expect(createdfolder).toMatchObject({
      id: response.body.id,
      name: originalName,
    });
    await request(setupApp())
      .put(`/network_plan/folder/${response.body.id}`)
      .send({
        name: newName,
      })
      .expect(200);
    dbRow = await network_plan_folder.findByPk(response.body.id);
    if (dbRow == null) {
      throw new Error('folder not created');
    }
    expect(dbRow.name).toBe(newName);
  });
});
describe('GET /folder', () => {
  test('returns all folders', async () => {
    await Promise.all([
      createTestFolder({
        name: 'test folder 1',
        fbid: '1',
      }),
      createTestFolder({
        name: 'test folder 2',
        fbid: '2',
      }),
      createTestFolder({
        name: 'test folder 3',
        fbid: '3',
      }),
    ]);
    const response = await request(setupApp())
      .get('/network_plan/folder')
      .expect(200);
    if (!Array.isArray(response.body)) {
      console.error(response.body);
      throw new Error('expected array body');
    }
    expect(response.body).toEqual(
      expect.arrayContaining([
        {
          id: expect.any(Number),
          name: 'test folder 1',
        },
        {
          id: expect.any(Number),
          name: 'test folder 2',
        },
        {
          id: expect.any(Number),
          name: 'test folder 3',
        },
      ]),
    );
  });
});
describe('GET ?folderId', () => {
  test('returns all plans in folder', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const folder2 = await createTestFolder({name: 'test folder', fbid: '123'});
    const createdRows = await network_plan.bulkCreate([
      ({
        name: 'test-1',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-2',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-3',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      // these items should not be returned
      ({
        name: 'test-4',
        folder_id: folder2.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-5',
        folder_id: folder2.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
    ]);
    expect(createdRows.length).toBe(5);
    const response = await request(setupApp())
      .get(`/network_plan/plan?folderId=${folder.id}`)
      .expect(200);
    expect(response.body.length).toBe(3);
    expect(response.body).toContainEqual({
      id: 1,
      name: 'test-1',
      folderId: folder.id,
      dsmFile: expect.any(Object),
      boundaryFile: expect.any(Object),
      sitesFile: expect.any(Object),
      state: NETWORK_PLAN_STATE.DRAFT,
      hardwareBoardIds: null,
    });
    expect(response.body).toContainEqual({
      id: 2,
      name: 'test-2',
      folderId: folder.id,
      dsmFile: expect.any(Object),
      boundaryFile: expect.any(Object),
      sitesFile: expect.any(Object),
      state: NETWORK_PLAN_STATE.DRAFT,
      hardwareBoardIds: null,
    });
    expect(response.body).toContainEqual({
      id: 3,
      name: 'test-3',
      folderId: folder.id,
      dsmFile: expect.any(Object),
      boundaryFile: expect.any(Object),
      sitesFile: expect.any(Object),
      state: NETWORK_PLAN_STATE.DRAFT,
      hardwareBoardIds: null,
    });
  });
  test('returns empty array if no plans found in folder', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
      fbid: '1234',
    });
    const folder2 = await createTestFolder({
      name: 'test folder 2',
      fbid: '123',
    });
    const createdRows = await network_plan.bulkCreate([
      // these items should not be returned
      ({
        name: 'test-4',
        folder_id: folder2.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-5',
        folder_id: folder2.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
    ]);
    expect(createdRows.length).toBe(2);
    const response = await request(setupApp())
      .get(`/network_plan/plan?folderId=${folder.id}`)
      .expect(200);
    expect(response.body).toHaveLength(0);
  });
  test('fetches state of in-progress plans from the ANP api', async () => {
    const plan1Fbid = '12345';
    const plan2Fbid = '12346';
    getPlanMock.mockResolvedValueOnce({
      id: plan1Fbid,
      plan_status: PLAN_STATUS.RUNNING,
    });
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const createdRows = await network_plan.bulkCreate([
      ({
        name: 'test-1',
        fbid: plan1Fbid,
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.RUNNING,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-2',
        fbid: plan2Fbid,
        folder_id: folder.id,
        // Plans are created in ANP after input files are uploaded.
        // Thus there will be no state for them yet.
        state: NETWORK_PLAN_STATE.UPLOADING_INPUTS,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-3',
        fbid: '12347',
        folder_id: folder.id,
        // Still a draft, not in ANP yet.
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-4',
        fbid: '12348',
        folder_id: folder.id,
        // No longer running, so need to fetch state.
        state: NETWORK_PLAN_STATE.SUCCESS,
      }: $Shape<NetworkPlanAttributes>),
    ]);
    expect(createdRows.length).toBe(4);
    await request(setupApp())
      .get(`/network_plan/plan?folderId=${folder.id}`)
      .expect(200);
    expect(getPlanMock).toHaveBeenCalledTimes(1);
    expect(
      nullthrows(await network_plan.findOne({where: {fbid: plan1Fbid}})).state,
    ).toBe(NETWORK_PLAN_STATE.RUNNING);
    // Should not have changed.
    expect(
      nullthrows(await network_plan.findOne({where: {fbid: plan2Fbid}})).state,
    ).toBe(NETWORK_PLAN_STATE.UPLOADING_INPUTS);
  });
});
describe('DELETE /folder/:id', () => {
  test('deletes a folder', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const [boundary, dsm, sites] = await createInputFiles({
      source: FILE_SOURCE.fbid,
    });
    const plan = await createTestPlan({
      folder_id: folder.id,
      dsm_file_id: dsm.id,
      boundary_file_id: boundary.id,
      sites_file_id: sites.id,
    });
    await request(setupApp()).get(`/network_plan/plan/${plan.id}`).expect(200);

    // delete the folder
    await request(setupApp())
      .delete(`/network_plan/folder/${folder.id}`)
      .expect(200);

    await expect(network_plan_folder.findByPk(folder.id)).resolves.toBeNull();
    await expect(network_plan.findByPk(plan.id)).resolves.toBeNull();
    await expect(network_plan_file.findByPk(dsm.id)).resolves.toBeNull();
    await expect(network_plan_file.findByPk(boundary.id)).resolves.toBeNull();
    await expect(network_plan_file.findByPk(sites.id)).resolves.toBeNull();
  });
});
describe('POST /plan', () => {
  test('creates a new plan', async () => {
    const folder = await createTestFolder({name: 'test folder'});
    const response = await request(setupApp())
      .post('/network_plan/plan')
      .send({
        name: 'new draft',
        folderId: folder.id,
      })
      .expect(200);
    const {body} = response;
    expect(body).toMatchObject({
      id: expect.any(Number),
      name: 'new draft',
      folderId: folder.id,
    });
    const dbResults = (await network_plan.findByPk(body.id))?.toJSON();
    expect(dbResults).toMatchObject({
      id: body.id,
      name: body.name,
      folder_id: body.folderId,
    });
  });

  test('returns an error if required params are not sent', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    await request(setupApp())
      .post('/network_plan/plan')
      .send({
        folderId: folder.id,
      })
      .expect(400);
    await request(setupApp())
      .post('/network_plan/plan')
      .send({
        name: 'test',
      })
      .expect(400);
    await request(setupApp()).post('/network_plan/plan').send({}).expect(400);
  });

  test('can set input files during creation', async () => {
    const [boundary, dsm, sites] = await createInputFiles();
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const response = await request(setupApp())
      .post('/network_plan/plan')
      .send({
        name: 'new draft',
        folderId: folder.id,
        boundaryFileId: boundary.id,
        dsmFileId: dsm.id,
        sitesFileId: sites.id,
      })
      .expect(200);
    const plan = response.body;
    expect(plan).toMatchObject({
      id: expect.any(Number),
      folderId: folder.id,
      name: 'new draft',
      dsmFile: expect.any(Object),
      sitesFile: expect.any(Object),
      boundaryFile: expect.any(Object),
    });
    const planRow = nullthrows(await network_plan.findByPk(plan.id)).toJSON();
    expect(planRow).toMatchObject({
      name: 'new draft',
      folder_id: folder.id,
      dsm_file_id: dsm.id,
      boundary_file_id: boundary.id,
      sites_file_id: sites.id,
    });
  });
});
describe('PUT /plan/:id', () => {
  test('renames an existing plan', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const dbPlan = await createTestPlan({
      name: 'test',
      folder_id: folder.id,
    });
    await request(setupApp())
      .put(`/network_plan/plan/${dbPlan.id}`)
      .send({
        name: 'test-renamed',
      })
      .expect(200);
    const updatedPlan = (await network_plan.findByPk(dbPlan.id))?.toJSON();
    expect(updatedPlan).toMatchObject({
      name: 'test-renamed',
      folder_id: folder.id,
    });
  });
  test('only modifies the plan targeted in the request', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    // one assertion per plan in the db
    expect.assertions(3);
    await network_plan.bulkCreate([
      ({
        name: 'test-1',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-2',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
      ({
        name: 'test-3',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
    ]);
    /**
     * the rows returned by bulkCreate dont have the all the
     * column properties like dsm_file_id so use findall for comparing later
     */
    const createdPlans = (await network_plan.findAll()).map(x => x.toJSON());
    const planToUpdate = createdPlans[0];
    await request(setupApp())
      .put(`/network_plan/plan/${planToUpdate.id}`)
      .send({
        name: 'test-2-renamed',
        folderId: folder.id,
      })
      .expect(200);

    const plansAfterUpdate = (await network_plan.findAll()).map(x =>
      x.toJSON(),
    );
    const notUpdatedPlans = plansAfterUpdate.filter(
      x => x.id !== planToUpdate.id,
    );
    const updatedPlan = plansAfterUpdate.find(x => x.id === planToUpdate.id);
    // assert that non-updated plans havent changed
    for (const p of notUpdatedPlans) {
      const originalRow = createdPlans.find(x => x.id === p.id);
      expect(originalRow).toMatchObject(p);
    }

    expect(updatedPlan).toMatchObject({
      id: planToUpdate.id,
      name: 'test-2-renamed',
      folder_id: folder.id,
    });
  });
  test('sets input files', async () => {
    const [boundary, dsm, sites] = await createInputFiles();
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const dbPlan = await createTestPlan({
      folder_id: folder.id,
    });
    expect(dbPlan.dsm_file_id).not.toBeTruthy();
    expect(dbPlan.boundary_file_id).not.toBeTruthy();
    expect(dbPlan.sites_file_id).not.toBeTruthy();
    await request(setupApp())
      .put(`/network_plan/plan/${dbPlan.id}`)
      .send({
        name: 'test-renamed',
        boundaryFileId: boundary.id,
        dsmFileId: dsm.id,
        sitesFileId: sites.id,
      })
      .expect(200);
    const updatedPlan = (await network_plan.findByPk(dbPlan.id))?.toJSON();
    expect(updatedPlan).toMatchObject({
      name: 'test-renamed',
      folder_id: folder.id,
      boundary_file_id: boundary.id,
      dsm_file_id: dsm.id,
      sites_file_id: sites.id,
    });
  });
  test('sets hardwareBoardIds', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const dbPlan = await createTestPlan({
      folder_id: folder.id,
      name: 'test plan',
    });
    await request(setupApp())
      .put(`/network_plan/plan/${dbPlan.id}`)
      .send({
        name: dbPlan.name,
        hardwareBoardIds: ['TEST_HWBOARD_ID'],
      });
    const updatedPlan = nullthrows(
      (await network_plan.findByPk(dbPlan.id))?.toJSON(),
    );
    expect(updatedPlan).toMatchObject({
      name: 'test plan',
      hardware_board_ids: ['TEST_HWBOARD_ID'],
    });
  });
});

describe('GET /plan/:id', () => {
  test('should return the plan and its input files', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const [boundary, dsm, sites] = await createInputFiles();
    const plan = await createTestPlan({
      folder_id: folder.id,
      dsm_file_id: dsm.id,
      boundary_file_id: boundary.id,
      sites_file_id: sites.id,
      hardware_board_ids: ['TEST'],
    });
    const response = await request(setupApp())
      .get(`/network_plan/plan/${plan.id}`)
      .expect(200);
    expect(response.body).toMatchObject({
      id: plan.id,
      name: plan.name,
      folderId: folder.id,
      dsmFile: inputFileRowToInputFile(dsm),
      boundaryFile: inputFileRowToInputFile(boundary),
      sitesFile: inputFileRowToInputFile(sites),
      hardwareBoardIds: ['TEST'],
    });
  });
  test('should return the plan and its input files when running', async () => {
    const plan1Fbid = '12345';
    getPlanMock.mockResolvedValueOnce({
      id: plan1Fbid,
      plan_status: PLAN_STATUS.SUCCEEDED,
    });
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const [boundary, dsm, sites] = await createInputFiles();
    const plan = await createTestPlan({
      state: NETWORK_PLAN_STATE.RUNNING,
      fbid: plan1Fbid,
      folder_id: folder.id,
      dsm_file_id: dsm.id,
      boundary_file_id: boundary.id,
      sites_file_id: sites.id,
    });
    const response = await request(setupApp())
      .get(`/network_plan/plan/${plan.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: plan.id,
      name: plan.name,
      folderId: folder.id,
      dsmFile: inputFileRowToInputFile(dsm),
      boundaryFile: inputFileRowToInputFile(boundary),
      sitesFile: inputFileRowToInputFile(sites),
      // Since state was RUNNING, we update with ANP
      state: NETWORK_PLAN_STATE.SUCCESS,
    });
  });
  test('fetches plan state from the ANP api if the draft plan is in-progress', async () => {
    const plan1Fbid = '12345';
    const plan2Fbid = '12346';
    getPlanMock.mockResolvedValueOnce({
      id: plan1Fbid,
      plan_status: PLAN_STATUS.RUNNING,
    });
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const createdRows = await network_plan.bulkCreate([
      ({
        id: 1,
        name: 'test-1',
        fbid: plan1Fbid,
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.RUNNING,
      }: $Shape<NetworkPlanAttributes>),
      ({
        id: 2,
        name: 'test-2',
        fbid: plan2Fbid,
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.UPLOADING_INPUTS,
      }: $Shape<NetworkPlanAttributes>),
      ({
        id: 3,
        name: 'test-3',
        fbid: '12347',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
    ]);
    expect(createdRows.length).toBe(3);
    // the first plan stays in the running state
    expect(
      (await request(setupApp()).get(`/network_plan/plan/${1}`).expect(200))
        .body.state,
    ).toBe(NETWORK_PLAN_STATE.RUNNING);
    expect(nullthrows(await network_plan.findByPk(1)).state).toBe(
      NETWORK_PLAN_STATE.RUNNING,
    );
    // the second plan should not change states
    expect(
      (await request(setupApp()).get(`/network_plan/plan/${2}`).expect(200))
        .body.state,
    ).toBe(NETWORK_PLAN_STATE.UPLOADING_INPUTS);
    expect(nullthrows(await network_plan.findByPk(2)).state).toBe(
      NETWORK_PLAN_STATE.UPLOADING_INPUTS,
    );
    // the third plan should not change states
    expect(
      (await request(setupApp()).get(`/network_plan/plan/${3}`).expect(200))
        .body.state,
    ).toBe(NETWORK_PLAN_STATE.DRAFT);
    expect(nullthrows(await network_plan.findByPk(3)).state).toBe(
      NETWORK_PLAN_STATE.DRAFT,
    );
    // getPlan should only be called for running plans
    expect(getPlanMock).toHaveBeenCalledTimes(1);
  });
});
describe('POST plan/:id/launch', () => {
  test('returns errors if plan fails validation', async () => {
    const folder = await createTestFolder({name: 'test folder'});
    const app = setupApp();
    const {body: plan} = await request(app)
      .post('/network_plan/plan')
      .send({
        name: 'new draft',
        folderId: folder.id,
      })
      .expect(200);
    const {body: launchPlanResult} = await request(app).post(
      `/network_plan/plan/${plan.id}/launch`,
    );
    expect(launchPlanResult.state).toBe(NETWORK_PLAN_STATE.ERROR);
    expect(launchPlanResult.errors).toEqual(
      expect.arrayContaining([
        {
          message: 'Missing DSM file',
        },
        {
          message: 'Missing boundary file',
        },
        {
          message: 'Missing boundary file',
        },
      ]),
    );
  });
  test('poll for input files READY before launch', async () => {
    const folder = await createTestFolder({name: 'test folder'});
    const [boundary, dsm, sites] = await createInputFiles();
    await makeANPDir('inputs');
    writeInputFile(boundary, Buffer.from('test-1'));
    writeInputFile(dsm, Buffer.from('test-2'));
    writeInputFile(sites, Buffer.from('test-3'));
    expect(boundary.fbid).toBeUndefined();
    expect(dsm.fbid).toBeUndefined();
    expect(sites.fbid).toBeUndefined();
    const {body: plan} = await request(setupApp())
      .post('/network_plan/plan')
      .send({
        name: 'new draft',
        folderId: folder.id,
        boundaryFileId: boundary.id,
        dsmFileId: dsm.id,
        sitesFileId: sites.id,
      })
      .expect(200);

    expect(createUploadSessionMock).not.toHaveBeenCalled();
    const {body: launchBody} = await request(setupApp())
      .post(`/network_plan/plan/${plan.id}/launch`)
      .expect(200);
    expect(launchBody.state).toBe(NETWORK_PLAN_STATE.RUNNING);
    // each file is just one chunk so 3 calls
    expect(createUploadSessionMock).toHaveBeenCalledTimes(3);
    expect(uploadChunkMock).toHaveBeenCalledTimes(3);
    // 1st file gets PENDING, PENDING, READY
    // 2nd file gets READY
    // 3rd file gets READY
    expect(getInputFileMock).toHaveBeenCalledTimes(5);
  });

  test('sets ANP plan status after successful launch', async () => {
    const [boundary, dsm, sites] = await createInputFiles({
      source: FILE_SOURCE.fbid,
    });
    const folder = await createTestFolder({name: 'test folder'});
    const {body: plan} = await request(setupApp())
      .post('/network_plan/plan')
      .send({
        name: 'new draft',
        folderId: folder.id,
        boundaryFileId: boundary.id,
        dsmFileId: dsm.id,
        sitesFileId: sites.id,
      })
      .expect(200);
    await request(setupApp())
      .post(`/network_plan/plan/${plan.id}/launch`)
      .expect(200);
    expect([NETWORK_PLAN_STATE.RUNNING]).toContain(
      nullthrows(await network_plan.findByPk(plan.id)).state,
    );
  });
  describe('with local files', () => {
    test('uploads local files to fb', async () => {
      const folder = await createTestFolder({name: 'test folder'});
      const [boundary, dsm, sites] = await createInputFiles();
      await makeANPDir('inputs');
      writeInputFile(boundary, Buffer.from('test-1'));
      writeInputFile(dsm, Buffer.from('test-2'));
      writeInputFile(sites, Buffer.from('test-3'));
      expect(boundary.fbid).toBeUndefined();
      expect(dsm.fbid).toBeUndefined();
      expect(sites.fbid).toBeUndefined();
      const {body: plan} = await request(setupApp())
        .post('/network_plan/plan')
        .send({
          name: 'new draft',
          folderId: folder.id,
          boundaryFileId: boundary.id,
          dsmFileId: dsm.id,
          sitesFileId: sites.id,
        })
        .expect(200);

      expect(createUploadSessionMock).not.toHaveBeenCalled();
      const {body: launchBody} = await request(setupApp())
        .post(`/network_plan/plan/${plan.id}/launch`)
        .expect(200);
      expect(launchBody.state).toBe(NETWORK_PLAN_STATE.RUNNING);
      // each file is just one chunk so 3 calls
      expect(createUploadSessionMock).toHaveBeenCalledTimes(3);
      expect(uploadChunkMock).toHaveBeenCalledTimes(3);
    });
    test('transitions the plan into the UPLOADING_INPUTS state', async () => {
      const folder = await createTestFolder({name: 'test folder'});
      const [boundary, dsm, sites] = await createInputFiles();
      await makeANPDir('inputs');
      writeInputFile(boundary, Buffer.from('test-1'));
      writeInputFile(dsm, Buffer.from('test-2'));
      writeInputFile(sites, Buffer.from('test-3'));
      const {body: plan} = await request(setupApp())
        .post('/network_plan/plan')
        .send({
          name: 'new draft',
          folderId: folder.id,
          boundaryFileId: boundary.id,
          dsmFileId: dsm.id,
          sitesFileId: sites.id,
        })
        .expect(200);

      const {body: launchBody} = await request(setupApp())
        .post(`/network_plan/plan/${plan.id}/launch`)
        .expect(200);
      expect(launchBody.state).toBe(NETWORK_PLAN_STATE.RUNNING);
      expect(createPlanMock).toHaveBeenCalled();
      expect(launchPlanMock).toHaveBeenCalled();
      expect(nullthrows(await network_plan.findByPk(plan.id)).state).toBe(
        NETWORK_PLAN_STATE.RUNNING,
      );
    });
  });
  describe('with only FBID files', () => {
    test('creates and launches plan', async () => {
      const [boundary, dsm, sites] = await createInputFiles({
        source: FILE_SOURCE.fbid,
      });
      const folder = await createTestFolder({name: 'test folder'});
      const {body: createdPlan} = await request(setupApp())
        .post('/network_plan/plan')
        .send({
          name: 'new draft',
          folderId: folder.id,
          boundaryFileId: boundary.id,
          dsmFileId: dsm.id,
          sitesFileId: sites.id,
        })
        .expect(200);
      const {body: launchBody} = await request(setupApp())
        .post(`/network_plan/plan/${createdPlan.id}/launch`)
        .expect(200);
      expect(launchBody.state).toBe(NETWORK_PLAN_STATE.RUNNING);
      expect(createPlanMock).toHaveBeenCalledWith({
        folder_id: folder.fbid,
        plan_name: createdPlan.name,
        boundary_polygon: createdPlan.boundaryFile.fbid.toString(),
        dsm: createdPlan.dsmFile.fbid.toString(),
        site_list: createdPlan.sitesFile.fbid.toString(),
        device_list_file: null,
      });
      expect(launchPlanMock).toHaveBeenCalled();
      const dbRow = nullthrows(await network_plan.findByPk(createdPlan.id));
      expect(dbRow.state).toBe(NETWORK_PLAN_STATE.RUNNING);
    });
    test(
      'if anp api returns errors, transitions the plan into the ERROR state' +
        ' and returns errors',
      async () => {
        launchPlanMock.mockResolvedValueOnce({success: false});
        const [boundary, dsm, sites] = await createInputFiles({
          source: FILE_SOURCE.fbid,
        });
        const folder = await createTestFolder({name: 'test folder'});
        const {body: plan} = await request(setupApp())
          .post('/network_plan/plan')
          .send({
            name: 'new draft',
            folderId: folder.id,
            boundaryFileId: boundary.id,
            dsmFileId: dsm.id,
            sitesFileId: sites.id,
          })
          .expect(200);
        const {body: launchBody} = await request(setupApp())
          .post(`/network_plan/plan/${plan.id}/launch`)
          .expect(500);
        expect(launchBody.state).toBe(NETWORK_PLAN_STATE.LAUNCH_ERROR);
        expect(nullthrows(await network_plan.findByPk(plan.id)).state).toBe(
          NETWORK_PLAN_STATE.LAUNCH_ERROR,
        );
      },
    );
    test('assigns the ANP fbid to the plan', async () => {
      const [boundary, dsm, sites] = await createInputFiles({
        source: FILE_SOURCE.fbid,
      });
      const folder = await createTestFolder({name: 'test folder'});
      const {body: createdPlan} = await request(setupApp())
        .post('/network_plan/plan')
        .send({
          name: 'new draft',
          folderId: folder.id,
          boundaryFileId: boundary.id,
          dsmFileId: dsm.id,
          sitesFileId: sites.id,
        })
        .expect(200);
      // there should be no fbid before the plan is submitted to ANP
      expect(nullthrows(await network_plan.findByPk(createdPlan.id)).fbid).toBe(
        null,
      );
      await request(setupApp())
        .post(`/network_plan/plan/${createdPlan.id}/launch`)
        .expect(200);

      expect(nullthrows(await network_plan.findByPk(createdPlan.id)).fbid).toBe(
        mockPlanFBID,
      );
    });
  });

  describe('hardware profiles', () => {
    test(
      'if the plan has no hardware_board_ids,' +
        ' does not upload device_list file',
      async () => {
        const [boundary, dsm, sites] = await createInputFiles({
          source: FILE_SOURCE.fbid,
        });
        const folder = await createTestFolder({name: 'test folder'});
        const plan = await createTestPlan({
          folder_id: folder.id,
          dsm_file_id: dsm.id,
          boundary_file_id: boundary.id,
          sites_file_id: sites.id,
        });
        expect(createUploadSessionMock).not.toHaveBeenCalled();
        await request(setupApp())
          .post(`/network_plan/plan/${plan.id}/launch`)
          .expect(200);
        expect([NETWORK_PLAN_STATE.RUNNING]).toContain(
          nullthrows(await network_plan.findByPk(plan.id)).state,
        );
        // all files are already uploaded and there is no device_list to upload
        expect(createUploadSessionMock).toHaveBeenCalledTimes(0);
      },
    );
    test(
      'if the plan has hardware_board_ids,' +
        ' uploads device_list file and ' +
        'adds the device_list_file parameter to the create-plan api call',
      async () => {
        const deviceListFBID = 'device_list_fbid';
        updateFileMetadataMock.mockImplementationOnce(req =>
          Promise.resolve({...req, id: deviceListFBID}),
        );
        loadProfilesMock.mockResolvedValueOnce(
          ([
            mockHardwareProfile({hwBoardId: 'TEST_SKU_1'}),
          ]: Array<HardwareProfile>),
        );
        const [boundary, dsm, sites] = await createInputFiles({
          source: FILE_SOURCE.fbid,
        });
        const folder = await createTestFolder({name: 'test folder'});
        const plan = await createTestPlan({
          folder_id: folder.id,
          dsm_file_id: dsm.id,
          boundary_file_id: boundary.id,
          sites_file_id: sites.id,
          hardware_board_ids: ['TEST_SKU_1'],
        });
        expect(createUploadSessionMock).not.toHaveBeenCalled();
        await request(setupApp())
          .post(`/network_plan/plan/${plan.id}/launch`)
          .expect(200);
        expect([NETWORK_PLAN_STATE.RUNNING]).toContain(
          nullthrows(await network_plan.findByPk(plan.id)).state,
        );
        // the only new file should be the hardware profiles file
        expect(createUploadSessionMock).toHaveBeenCalledTimes(1);
        expect(createUploadSessionMock).toHaveBeenCalledWith({
          file_name: 'hardware_profiles',
          file_type: 'application/json',
          file_length: expect.any(Number),
        });
        expect(updateFileMetadataMock).toHaveBeenCalledWith({
          file_name: 'hardware_profiles',
          file_extension: 'json',
          file_role: FILE_ROLE.URBAN_DEVICE_LIST_JSON,
          file_handle: expect.any(String),
        });
        expect(createPlanMock).toHaveBeenCalledWith({
          folder_id: folder.fbid,
          plan_name: plan.name,
          boundary_polygon: boundary.fbid,
          dsm: dsm.fbid,
          site_list: sites.fbid,
          device_list_file: deviceListFBID,
        });
      },
    );
    test('if the requested hardware profiles are not loaded, fails to launch plan', async () => {
      loadProfilesMock.mockResolvedValueOnce([]);
      const [boundary, dsm, sites] = await createInputFiles({
        source: FILE_SOURCE.fbid,
      });
      const folder = await createTestFolder({name: 'test folder'});
      const plan = await createTestPlan({
        folder_id: folder.id,
        dsm_file_id: dsm.id,
        boundary_file_id: boundary.id,
        sites_file_id: sites.id,
        hardware_board_ids: ['TEST_SKU_1'],
      });
      expect(createUploadSessionMock).not.toHaveBeenCalled();
      await request(setupApp())
        .post(`/network_plan/plan/${plan.id}/launch`)
        .expect(500);
      expect(nullthrows(await network_plan.findByPk(plan.id)).state).toBe(
        NETWORK_PLAN_STATE.LAUNCH_ERROR,
      );
    });
  });
});
describe('POST plan/:id/cancel', () => {
  it('should cancel a running plan', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const plan = await network_plan.create(
      ({
        id: 1,
        name: 'test-1',
        fbid: 'fbid1',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.RUNNING,
      }: $Shape<NetworkPlanAttributes>),
    );
    await request(setupApp()).post(`/network_plan/plan/${plan.id}/cancel`);
    expect(cancelPlanMock).toBeCalledWith({id: 'fbid1'});
  });
  it('should throw an error if plan does not exist in ANP', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const plan = await network_plan.create(
      ({
        id: 1,
        name: 'test-1',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.UPLOADING_INPUTS,
      }: $Shape<NetworkPlanAttributes>),
    );
    const {body} = await request(setupApp()).post(
      `/network_plan/plan/${plan.id}/cancel`,
    );
    expect(body).toEqual('Plan not launched');
  });
});
describe('DELETE plan/:id', () => {
  test('deletes a plan and its input files', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    const {body: plan} = await request(setupApp())
      .post('/network_plan/plan')
      .send({
        name: 'new draft',
        folderId: folder.id,
      })
      .expect(200);

    // delete the plan
    await request(setupApp())
      .delete(`/network_plan/plan/${plan.id}`)
      .expect(200);

    const nullPlan = await network_plan.findByPk(plan.id);
    expect(nullPlan).toBeNull();
  });
});

describe('POST /file', () => {
  test('creates an FBID file reference', async () => {
    const {body} = await request(setupApp())
      .post(`/network_plan/file`)
      .send({
        source: FILE_SOURCE.fbid,
        fbid: mockFileFBID,
      })
      .expect(200);
    expect(body).toMatchObject({
      id: expect.any(Number),
      role: FILE_ROLE.DSM_GEOTIFF,
    });
    const dbRow = nullthrows(
      await network_plan_file.findByPk(body.id),
    ).toJSON();
    expect(dbRow).toMatchObject({
      id: body.id,
      role: body.role,
      name: body.name,
    });
  });
  test('creates a local file reference', async () => {
    const {body} = await request(setupApp())
      .post(`/network_plan/file`)
      .send({
        source: FILE_SOURCE.local,
        role: FILE_ROLE.DSM_GEOTIFF,
        name: 'dsm',
      })
      .expect(200);
    expect(body).toMatchObject({
      id: expect.any(Number),
      role: FILE_ROLE.DSM_GEOTIFF,
    });
  });
});
describe('POST /file/:id', () => {
  test('writes uploaded filedata to disk', async () => {
    const file = (
      await network_plan_file.create(
        ({
          name: 'sites.csv',
          role: FILE_ROLE.URBAN_SITE_FILE,
          source: FILE_SOURCE.local,
          state: FILE_STATE.pending,
        }: $Shape<NetworkPlanFileAttributes>),
      )
    ).toJSON();
    const expectedFilePath = path.join(
      getBaseDir(),
      'inputs',
      `${file.id}-${file.name}`,
    );

    expectFileExists(expectedFilePath, false);
    const fileData = Buffer.from('test');
    await request(setupApp())
      .post(`/network_plan/file/${file.id}`)
      .attach('file', fileData, 'sites.csv')
      .expect(200);
    expectFileExists(expectedFilePath, true);
    const writtenFiledata = fsMock.readFileSync(expectedFilePath, 'utf8');
    expect(writtenFiledata).toBe('test');
  });

  test('transitions file to ready state once fully uploaded', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });
    await createTestPlan({
      folder_id: folder.id,
    });
    const file = (
      await network_plan_file.create(
        ({
          name: 'sites.csv',
          role: FILE_ROLE.URBAN_SITE_FILE,
          source: FILE_SOURCE.local,
          state: FILE_STATE.pending,
        }: $Shape<NetworkPlanFileAttributes>),
      )
    ).toJSON();

    const pendingRow = await network_plan_file.findByPk(file.id);
    expect(pendingRow?.state).toBe(FILE_STATE.pending);
    const fileData = Buffer.from('test');
    await request(setupApp())
      .post(`/network_plan/file/${file.id}`)
      .attach('file', fileData, 'sites.csv')
      .expect(200);
    const readyRow = await network_plan_file.findByPk(file.id);
    expect(readyRow?.state).toBe(FILE_STATE.ready);
  });
});
describe('GET /file/:id/download', () => {});
describe('DELETE /file/:id', () => {
  test('removes the file from the plan and deletes the file from disk', async () => {
    await createTestFolder({
      name: 'test folder',
    });

    // create the expected database objects
    const file = (
      await network_plan_file.create(
        ({
          name: 'sites.csv',
          role: FILE_ROLE.URBAN_SITE_FILE,
          source: FILE_SOURCE.local,
          state: FILE_STATE.pending,
        }: $Shape<NetworkPlanFileAttributes>),
      )
    ).toJSON();

    const fileData = Buffer.from('test');
    await request(setupApp())
      .post(`/network_plan/file/${file.id}`)
      .attach('file', fileData, 'sites.csv')
      .expect(200);

    const expectedFilePath = path.join(
      getBaseDir(),
      'inputs',
      `${file.id}-${file.name}`,
    );
    expectFileExists(expectedFilePath, true);
    const fileRow = await network_plan_file.findByPk(file.id);
    expect(fileRow).not.toBeNull();

    // send the delete request
    await request(setupApp())
      .delete(`/network_plan/file/${file.id}`)
      .expect(200);

    const shouldBeDeleted = await network_plan_file.findByPk(file.id);
    expect(shouldBeDeleted).toBeNull();
    expectFileExists(expectedFilePath, false);
  });
  test('delete does not remove file if other plans reference it', async () => {
    const folder = await createTestFolder({
      name: 'test folder',
    });

    // create the expected database objects
    const planId = 123;
    const planRow = await network_plan.create(
      ({
        id: planId,
        name: 'test',
        folder_id: folder.id,
        state: NETWORK_PLAN_STATE.DRAFT,
      }: $Shape<NetworkPlanAttributes>),
    );
    const file = (
      await network_plan_file.create(
        ({
          name: 'sites.csv',
          role: FILE_ROLE.URBAN_SITE_FILE,
          source: FILE_SOURCE.local,
          state: FILE_STATE.pending,
        }: $Shape<NetworkPlanFileAttributes>),
      )
    ).toJSON();

    const fileData = Buffer.from('test');
    await request(setupApp())
      .post(`/network_plan/file/${file.id}`)
      .attach('file', fileData, 'sites.csv')
      .expect(200);

    planRow.sites_file_id = file.id;
    await planRow.save();

    const expectedFilePath = path.join(
      getBaseDir(),
      'inputs',
      `${file.id}-${file.name}`,
    );
    expectFileExists(expectedFilePath, true);
    const fileRow = await network_plan_file.findByPk(file.id);
    expect(fileRow).not.toBeNull();

    // send the delete request
    await request(setupApp())
      .delete(`/network_plan/file/${file.id}`)
      .expect(200);

    // File shouldn't be deleted
    const shouldBeDeleted = await network_plan_file.findByPk(file.id);
    expect(shouldBeDeleted).not.toBeNull();
    expectFileExists(expectedFilePath, true);
  });
});

function setupApp() {
  return setupTestApp('/network_plan', require('../routes').default);
}

async function createInputFiles(defaults: ?{source?: FileSourceKey}) {
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
  ).map(x => x.toJSON());
  return files;
}
