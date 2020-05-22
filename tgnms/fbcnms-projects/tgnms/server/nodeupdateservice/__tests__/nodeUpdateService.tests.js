/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {ExpressRequest, ExpressResponse, Middleware} from 'express';
jest.mock('../../websockets/service');
import express from 'express';
import request from 'supertest';
jest.mock('request');
const requestMock = require('request');
const stream = require('stream');
import manager from '../../websockets/service';
import superagent from 'superagent';
import {Buffer} from 'buffer';

jest.mock('../../middleware/otp', () => ({
  __esmodule: true,
  otpMiddleware: jest.fn(() => (_req, _res, next) => next()),
}));

describe("/list - get a list of a suite's releases", () => {
  // Test proper response is received for good inputs
  test('/list: all required params present', async () => {
    requestMock.mockImplementationOnce((_input, done) => {
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
    const app = setupApp();
    const testHeaders = {};
    const _response = await request(app)
      .post('/nodeupdateservice/list')
      .send(testHeaders)
      .expect(400);
  });
});

describe('/downloadimage/:network/:release/:image', () => {
  beforeEach(() => {
    manager.startHeartbeatChecker();
  });

  afterEach(() => {
    manager.stopHeartbeatChecker();
  });

  test('check if file is piped from the external api', done => {
    const app = setupApp();
    const requestStream = makeStreamingDownloadMock();
    requestMock.mockImplementationOnce(jest.fn(_input => requestStream));
    jest.spyOn(requestStream, 'on');
    jest.spyOn(requestStream, 'pipe');
    request(app)
      .get('/nodeupdateservice/downloadimage/testnetwork/testrelease/image')
      .expect(200)
      .buffer(true)
      .parse(superagent.parse.image)
      .then(response => {
        expect(requestMock).toHaveBeenCalledWith({
          url: `https://sw.terragraph.link/download/tg_firmware_rev5/testrelease/image`,
          method: 'POST',
          json: {
            api_id: 'tgdev',
            api_token: 'K__AjuA9ii_Mwq7FYV00PWS-e6Y',
          },
        });
        expect(requestStream.on).toHaveBeenCalled();
        expect(requestStream.pipe).toHaveBeenCalled();
        expect(Buffer.isBuffer(response.body));
        done();
      });
    const buffer = Buffer.from('test file data');
    requestStream.emit('data', buffer);
    requestStream.end();
  });

  // T57895888 @clavelle - Fix this test
  xtest('returns an error if external api returns error', done => {
    const app = setupApp();
    const requestStream = makeStreamingDownloadMock();
    requestMock.mockImplementationOnce(jest.fn(_input => requestStream));
    request(app)
      .get('/nodeupdateservice/downloadimage/testnetwork/testrelease/image')
      .expect(500)
      .then(_response => {
        expect(requestStream.on).toHaveBeenCalled();
        expect(requestStream.pipe).toHaveBeenCalled();
        done();
      });
    requestStream.response.statusCode = 500;
    requestStream.emit('data', 'error');
    requestStream.end();
  });
});

function setupApp() {
  const app = express();
  app.use(require('body-parser').json());
  const routes: Middleware = require('../routes');
  app.use('/nodeupdateservice', routes);
  app.use((err: Error, _req: ExpressRequest, _res: ExpressResponse, _next) => {
    // better error logging during testing
    console.error(err);
    throw err;
  });
  return app;
}

function makeStreamingDownloadMock() {
  return new (class MockStream extends stream.PassThrough {
    response = {
      headers: {
        'content-length': '1000',
      },
    };
  })({objectMode: true});
}
