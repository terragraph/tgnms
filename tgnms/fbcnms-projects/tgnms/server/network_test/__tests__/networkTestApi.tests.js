/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * // WARNING: These are API contract tests!
 * If these tests break, ensure that you have not introduced
 * api breaking changes.
 */

import axios from 'axios';
import express from 'express';
import request from 'supertest';
import {
  mockExecutionResults,
  mockExecutions,
  mockSchedules,
} from '../../../app/tests/data/NetworkTestApi';

jest.mock('axios');

afterEach(() => {
  jest.clearAllMocks();
});

describe('/executions/:id - get a single execution by id', () => {
  test('returns a single execution', async () => {
    const app = setupApp();
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockExecutionResults(),
    });

    const response = await request(app)
      .get('/network_test/execution_result/1')
      .expect(200);
    expect(getMock).toHaveBeenCalled();
    expect(response.body.execution.id).toBe(1);
  });
});

describe('/executions - get recent test executions', () => {
  test('?network: network name returns executions which ran on that network', async () => {
    const app = setupApp();
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockExecutions(),
    });

    const response = await request(app)
      .get('/network_test/executions?network_name=fbtest')
      .expect(200);

    expect(getMock).toHaveBeenCalled();
    expect(response.body.length).toBe(2);
    expect(response.body[0].id).toBe(1);
    expect(response.body[1].id).toBe(3);
    expect(response.body[0].network_name).toBe('fbtest');
  });

  test('?testType: returns executions only of a certain test type', async () => {
    const app = setupApp();
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockExecutions(),
    });
    const response = await request(app)
      .get(
        '/network_test/executions?network_name=fbtest&test_type=PARALLEL_LINK',
      )
      .expect(200);

    expect(getMock).toHaveBeenCalled();
    expect(response.body[0].test_type).toBe('PARALLEL_LINK');
    expect(response.body[0].network_name).toBe('fbtest');
  });
});

describe('/schedule/:networkName - get the schedule for a network', () => {
  test('returns all scheduled tests for a given network', async () => {
    const app = setupApp();
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockSchedules(),
    });

    const response = await request(app)
      .get('/network_test/schedule?network_name=fbtest')
      .expect(200);
    expect(getMock).toHaveBeenCalled();
    expect(response.body[0].id === 1);
    expect(response.body[0].cron_expr === '*');
  });
});

describe('DELETE /schedule/:scheduleId', () => {
  test('makes modify_sched request to network test api', async () => {
    const app = setupApp();
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: {message: 'deleted schedule 1'},
    });

    const response = await request(app)
      .delete('/network_test/schedule/1')
      .expect(200);
    expect(getMock).toHaveBeenCalled();
    expect(response.body.message === 'deleted schedule 1');
  });
});

function setupApp() {
  const app = express();
  app.use('/network_test', require('../routes'));
  return app;
}
