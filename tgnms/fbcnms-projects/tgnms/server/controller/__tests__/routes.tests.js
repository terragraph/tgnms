/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import request from 'supertest';
import {Buffer} from 'buffer';
import {URL} from 'url';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
const fsMock = require('fs');

const NETWORK_UPGRADE_IMAGES_REL_PATH = 'static/tg-binaries';
const MOCK_DATE = '20191003';
const MOCK_FILE_NAME = 'tg-image.bin';

// make Date.now() stable so we can assert against it
jest.spyOn(Date, 'now').mockReturnValue(MOCK_DATE);
jest.mock('fs', () => new (require('memfs').Volume)());

beforeEach(() => {
  fsMock.mkdirSync('./' + NETWORK_UPGRADE_IMAGES_REL_PATH, {recursive: true});
});

afterEach(() => {
  // any because of mocking
  (fsMock: any).reset();
});

test('uploading an image should return a valid imageUrl', async () => {
  const app = setupApp();
  const response = await request(app)
    .post('/controller/uploadUpgradeBinary')
    .attach('binary', Buffer.from('test'), MOCK_FILE_NAME)
    .expect(200);
  expect(response.body.imageUrl).toBeDefined();
  const url = new URL(response.body.imageUrl);
  expect(url.pathname).toBe(
    `/${NETWORK_UPGRADE_IMAGES_REL_PATH}/${MOCK_DATE}-${MOCK_FILE_NAME}`,
  );
});

test('image upload saves to the filesystem', async () => {
  const app = setupApp();
  const filePath = `${NETWORK_UPGRADE_IMAGES_REL_PATH}/${MOCK_DATE}-${MOCK_FILE_NAME}`;
  expect(fsMock.existsSync(filePath)).toBe(false);
  await request(app)
    .post('/controller/uploadUpgradeBinary')
    .attach('binary', Buffer.from('test'), MOCK_FILE_NAME)
    .expect(200);
  expect(fsMock.existsSync(filePath)).toBe(true);
});

test('imageUrl should contain a one-time-password for e2e to access nms', async () => {
  const app = setupApp();
  const response = await request(app)
    .post('/controller/uploadUpgradeBinary')
    .attach('binary', Buffer.from('test'), MOCK_FILE_NAME)
    .expect(200);
  expect(response.body.imageUrl).toBeDefined();
  const url = new URL(response.body.imageUrl);
  expect(url.searchParams.has('token')).toBe(true);
});

function setupApp() {
  return setupTestApp('/controller', require('../routes').default);
}
