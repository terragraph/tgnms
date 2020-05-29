/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as apiUtil from '../NetworkTestAPIUtil';
import axios from 'axios';
import {HEALTH_CODES} from '../../constants/HealthConstants';
import {TEST_STATUS} from '../../../shared/dto/TestResult';
import {mockCancelToken} from '../../tests/testHelpers';
import {mockExecutionResults} from '../../tests/data/NetworkTestApi';

jest.mock('axios');

afterEach(() => {
  jest.clearAllMocks();
});

describe('getExecutionResults', () => {
  test('makes an axios request', async () => {
    const getMock = jest.spyOn(axios, 'default').mockResolvedValueOnce({
      data: mockExecutionResults(),
    });

    const {results} = await apiUtil.getExecutionResults({
      executionId: '1',
      cancelToken: mockCancelToken(),
    });
    expect(getMock).toHaveBeenCalled();
    expect(results[0].id).toBe(1);
    expect(results[0].status).toBe('FINISHED');
  });
});

describe('getTestResults', () => {
  test('makes an axios request', async () => {
    const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: mockTestResults(),
    });
    const [result] = await apiUtil.getTestResults({});
    expect(getMock).toHaveBeenCalledWith(
      'http://localhost/network_test/results',
    );
    expect(result.id).toBe(1);
    expect(result.status).toBe(TEST_STATUS.FINISHED);
  });

  test('converts date strings to actual dates', async () => {
    const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: mockTestResults(),
    });
    const [result] = await apiUtil.getTestResults({});
    expect(getMock).toHaveBeenCalledWith(
      'http://localhost/network_test/results',
    );
    expect(result.start_date_utc).toBeInstanceOf(Date);
    expect(result.end_date_utc).toBeInstanceOf(Date);
  });
  test('overrides health for in progress tests', async () => {
    const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: [{id: 1, status: TEST_STATUS.RUNNING}],
    });
    const [result] = await apiUtil.getTestResults({});
    expect(getMock).toHaveBeenCalledWith(
      'http://localhost/network_test/results',
    );
    expect(result.health).toBe(HEALTH_CODES.MISSING);
  });
  test('appends parameters to the url as query params', async () => {
    const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: mockTestResults(),
    });
    await apiUtil.getTestResults({
      executionId: '1',
      results: ['1', '2'],
      metrics: ['health', 'origin_node'],
    });
    // parse the url that was requested and check the params
    const requestedUrl = new URL(getMock.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get('executionId')).toBe('1');
    expect(requestedUrl.searchParams.get('results')).toBe('1,2');
    expect(requestedUrl.searchParams.get('metrics')).toBe('health,origin_node');
  });

  // return any to simulate the axios response
  function mockTestResults(): Array<any> {
    // only a few result properties are important so we can just ignore the rest
    return [
      {
        id: 1,
        status: TEST_STATUS.FINISHED,
        start_date_utc: new Date().toString(),
        end_date_utc: new Date().toString(),
      },
    ];
  }
});
