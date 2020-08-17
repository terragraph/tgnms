/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {buildUIConfig} from '../ui';
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
