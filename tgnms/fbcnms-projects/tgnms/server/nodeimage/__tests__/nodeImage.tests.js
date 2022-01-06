/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import manager from '../../websockets/service';
import request from 'supertest';
import superagent from 'superagent';
import {Buffer} from 'buffer';
import {setupTestApp} from '@fbcnms/tg-nms/server/tests/expressHelpers';
const requestMock = require('request');
const stream = require('stream');

jest.mock('../../websockets/service');
jest.mock('request');
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
      .post('/nodeimage/list')
      .send(testHeaders)
      .expect(200);
    expect(response.body.data).toBeDefined();
  });

  // Test errors when mandatory params are not provided
  test('/list: suite missing', async () => {
    const app = setupApp();
    const testHeaders = {};
    const _response = await request(app)
      .post('/nodeimage/list')
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
      .get('/nodeimage/downloadimage/testnetwork/testrelease/image')
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
});

function setupApp() {
  return setupTestApp('/nodeimage', require('../routes').default);
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
