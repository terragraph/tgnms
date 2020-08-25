/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {buildUIConfig, makeFeatureFlags} from '../ui';
import {mockRequest} from '../../tests/expressHelpers';
jest.mock('../../models');

const _getAllNetworkConfigsMock = jest
  .spyOn(require('../../topology/model'), 'getAllNetworkConfigs')
  .mockReturnValue({});

const OLD_ENV = process.env;
beforeEach(() => {
  process.env = {...OLD_ENV};
  delete process.env.NODE_ENV;
});
afterEach(() => {
  process.env = OLD_ENV;
});

test('by default returns configObj', () => {
  process.env.GRAFANA_URL = 'test';
  const conf = buildUIConfig(mockRequest());
  expect(conf).toMatchObject({
    env: {GRAFANA_URL: 'test'},
    networks: {},
    user: undefined,
    version: expect.any(String),
  });
});

describe('makeFeatureFlags', () => {
  test('if env is not specified, isDefaultEnabled should enable/disable the env', () => {
    expect(makeFeatureFlags({})).toMatchObject({
      SERVICE_AVAILABILITY_ENABLED: false,
      TASK_BASED_CONFIG_ENABLED: true,
      NMS_SETTINGS_ENABLED: true,
      WEBSOCKETS_ENABLED: false,
      NMS_BACKUP_ENABLED: false,
      GET_SYSDUMP_ENABLED: false,
      MAP_ANNOTATIONS_ENABLED: false,
    });
  });
  test('if env is specified, isDefaultEnabled should have no effect', () => {
    expect(makeFeatureFlags({WEBSOCKETS_ENABLED: ''})).toMatchObject({
      WEBSOCKETS_ENABLED: true,
    });
  });
  test('true/false strings, 1/0, or empty string are correctly parsed', () => {
    expect(
      makeFeatureFlags({
        NMS_BACKUP_ENABLED: 'true',
        GET_SYSDUMP_ENABLED: '',
        TASK_BASED_CONFIG_ENABLED: '1',
        MAP_ANNOTATIONS_ENABLED: 'false',
        NMS_SETTINGS_ENABLED: '0',
      }),
    ).toMatchObject({
      NMS_BACKUP_ENABLED: true,
      GET_SYSDUMP_ENABLED: true,
      TASK_BASED_CONFIG_ENABLED: true,
      MAP_ANNOTATIONS_ENABLED: false,
      NMS_SETTINGS_ENABLED: false,
    });
  });
});
