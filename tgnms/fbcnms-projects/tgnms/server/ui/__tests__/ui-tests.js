/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {buildUIConfig, makeFeatureFlags, makeMapStyles} from '../ui';
import {mockRequest} from '../../tests/expressHelpers';
jest.mock('../../models');

const _getAllNetworkConfigsMock = jest
  .spyOn(require('../../topology/model'), 'getAllNetworkConfigs')
  .mockReturnValue({});

const DEFAULT_FB_URL =
  'https://external.xx.fbcdn.net/maps/vt/style/canterbury_1_0';
const OLD_ENV = process.env;
beforeEach(() => {
  jest.resetModules();
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
      SERVICE_AVAILABILITY_ENABLED: true,
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
        MAP_ANNOTATIONS_ENABLED: 'false',
        NMS_SETTINGS_ENABLED: '0',
      }),
    ).toMatchObject({
      NMS_BACKUP_ENABLED: true,
      GET_SYSDUMP_ENABLED: true,
      MAP_ANNOTATIONS_ENABLED: false,
      NMS_SETTINGS_ENABLED: false,
    });
  });
});

describe('makeMapStyles', () => {
  test('Returns only facebook style if only MAPSTYLE_FACEBOOK_ENABLED', () => {
    process.env.FACEBOOK_MAPSTYLE_URL = DEFAULT_FB_URL;
    const mapStyles = makeMapStyles({MAPSTYLE_FACEBOOK_ENABLED: true}, {});
    expect(mapStyles).toHaveLength(1);
    expect(mapStyles).toContainEqual({
      name: 'Facebook',
      url: DEFAULT_FB_URL,
    });
  });
  test(
    'Returns mapbox styles if MAPSTYLE_MAPBOX_ENABLED and' +
      ' MAPBOX_ACCESS_TOKEN is provided',
    () => {
      process.env.MAPBOX_ACCESS_TOKEN = 'abc123';
      const mapStyles = makeMapStyles(
        {MAPSTYLE_MAPBOX_ENABLED: true},
        {MAPBOX_ACCESS_TOKEN: 'abc123'},
      );
      expect(mapStyles).toHaveLength(2);

      const baseUrl = 'mapbox://styles/mapbox/';
      expect(mapStyles).toContainEqual({
        name: 'Streets',
        url: baseUrl + 'streets-v10',
      });
      expect(mapStyles).toContainEqual({
        name: 'Satellite',
        url: baseUrl + 'satellite-streets-v10',
      });
    },
  );
  test(
    'Does not return mapbox styles if MAPSTYLE_MAPBOX_ENABLED and' +
      ' MAPBOX_ACCESS_TOKEN is not provided',
    () => {
      const mapStyles = makeMapStyles({MAPSTYLE_MAPBOX_ENABLED: true}, {});
      expect(mapStyles).toHaveLength(0);
    },
  );

  test('Skips custom styles if invalid', () => {
    process.env.TILE_STYLE = 'abc';
    expect(makeMapStyles({}, {})).toHaveLength(0);
    process.env.TILE_STYLE = 'abc=';
    expect(makeMapStyles({}, {})).toHaveLength(0);
    // 3 separate styles, only one valid
    process.env.TILE_STYLE = 'bad1=,test=https://test.com/test?v=1,bad2';
    const mapStyle = makeMapStyles({}, {});
    expect(mapStyle).toHaveLength(1);
    expect(mapStyle).toContainEqual({
      name: 'test',
      url: 'https://test.com/test?v=1',
    });
  });
});
