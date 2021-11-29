/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
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
