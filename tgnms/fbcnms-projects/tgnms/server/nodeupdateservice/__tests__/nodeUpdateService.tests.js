/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import express from 'express';
import request from 'supertest';
const {API_REQUEST_TIMEOUT} = require('../../config');
jest.mock('request');
const requestMock = require('request');

describe("/list - get a list of a suite's releases", () => {
  beforeEach(() => {
    jest.setTimeout(API_REQUEST_TIMEOUT);
  });

  // Test proper response is received for good inputs
  test('/list: all required params present', async () => {
    requestMock.mockImplementationOnce((input, done) => {
      done(null, {
        statusCode: 200,
        body: {
          error: false,
          id: 1,
          data: {
            m38: {
              'tg-update-armada39x.bin': {
                shasum: '345kj3nf3fer4fe45yg',
              },
            },
          },
        },
      });
    });
    const app = setupApp();
    const testHeaders = {
      suite: 'tg_firmware_rev5',
    };
    const response = await request(app)
      .post('/nodeupdateservice/list')
      .send(testHeaders)
      .expect(200);
    expect(response.body.data).toBeDefined();
  });

  // Test errors when mandatory params are not provided
  test('/list: suite missing', async () => {
    requestMock.mockImplementationOnce((input, done) => {
      done(null, {
        statusCode: 400,
        body: {
          error: true,
          id: 1,
        },
      });
    });
    const app = setupApp();
    const testHeaders = {};
    const _response = await request(app)
      .post('/nodeupdateservice/list')
      .send(testHeaders)
      .expect(400);
  });
});

function setupApp() {
  const app = express();
  app.use(require('body-parser').json());
  app.use('/nodeupdateservice', require('../routes'));
  return app;
}
