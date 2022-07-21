/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import request from 'supertest';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
const fsMock = require('fs');

jest.mock('fs', () => new (require('memfs').Volume)());

const PATH = './sysdump';
beforeEach(() => {
  fsMock.mkdirSync(PATH, {recursive: true});
  fsMock.writeFileSync(PATH + '/test1', 'test1');
  fsMock.writeFileSync(PATH + '/test2', 'test2');
  fsMock.writeFileSync(PATH + '/test3', 'test3');
});

test('/ endpoint parses sysdump directory correctly', async () => {
  const app = setupApp();

  const response = await request(app).get('/sysdump/').expect(200);
  expect(response.body).toHaveLength(3);
});

test('/delete endpoint deletes in filesystem', async () => {
  const app = setupApp();
  const data = {sysdumps: ['test1']};

  const responseDelete = await request(app)
    .post('/sysdump/delete')
    .send(data)
    .expect(200);
  expect(responseDelete.body.deleted).toHaveLength(1);

  expect(fsMock.existsSync(PATH + '/test1')).toBeFalse;

  const response = await request(app).get('/sysdump/').expect(200);
  expect(response.body).toHaveLength(2);
});

function setupApp() {
  return setupTestApp('/sysdump', require('../routes').default);
}
