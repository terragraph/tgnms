import * as axios from 'axios';
import * as networkHelpers from '../network';
import {refreshPrometheusStatus, reloadInstanceConfig} from '../model';
import type {AddJestTypes} from 'jest';
jest.mock('../../models');
jest.mock('axios');
const axiosMock: $ObjMapi<typeof axios, AddJestTypes> = axios;
jest.mock('../network');
const networkHelpersMock: $ObjMapi<
  typeof networkHelpers,
  AddJestTypes,
> = networkHelpers;
networkHelpersMock.getNetworkList.mockResolvedValue([{name: 'test'}]);

describe('refreshPrometheusStatus', () => {
  test('does not throw when request fails', async () => {
    axiosMock.get.mockRejectedValueOnce(new Error('Request failed'));
    await reloadInstanceConfig();
    await expect(refreshPrometheusStatus()).resolves.not.toThrow();
  });
});
