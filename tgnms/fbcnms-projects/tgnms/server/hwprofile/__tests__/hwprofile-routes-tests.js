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

const setupApp = () => setupTestApp('/hwprofile', require('../routes').default);

describe('GET /hwprofile', () => {
  test('returns all defined hardware profiles', async () => {
    const app = setupApp();
    const response = await request(app).get('/hwprofile').expect(200);
    expect(response.body).toMatchObject({default: {}});
    for (const key of Object.keys(response.body)) {
      const profile = response.body[key];
      expect(profile.hwBoardId).toBe(key);
    }
  });
});
