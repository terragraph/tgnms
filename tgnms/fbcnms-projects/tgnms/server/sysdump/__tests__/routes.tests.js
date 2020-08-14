/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */
import bodyParser from 'body-parser';
import express from 'express';
import request from 'supertest';
const fsMock = require('fs');
const PATH = './sysdump';

jest.mock('fs', () => new (require('memfs').Volume)());

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
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use('/sysdump', require('../routes'));
  return app;
}
