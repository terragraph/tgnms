/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const logger = require('../log')(module);
const {getAllNetworkConfigs} = require('../topology/model');
import type {Request} from '../types/express';
import type {UIConfig, UIEnv} from '../../shared/dto/UI';

// define which env keys to add to config
const envKeys: Array<$Keys<UIEnv>> = [
  'GRAFANA_URL',
  'MAPBOX_ACCESS_TOKEN',
  'ISSUES_URL',
  'NETWORKTEST_HOST',
  'SCANSERVICE_ENABLED',
  'LOGIN_ENABLED',
  'TILE_STYLE',
  'COMMIT_DATE',
  'COMMIT_HASH',
  'DOC_URL',
  'NOTIFICATION_MENU_ENABLED',
  'SERVICE_AVAILABILITY_ENABLED',
  'SOFTWARE_PORTAL_ENABLED',
  'ALARMS_ENABLED',
  'DEFAULT_ROUTES_HISTORY_ENABLED',
  'JSON_CONFIG_ENABLED',
  'MAP_HISTORY_ENABLED',
  'NMS_SETTINGS_ENABLED',
  'MAP_ANNOTATIONS_ENABLED',
  'TASK_BASED_CONFIG_ENABLED',
  'GET_SYSDUMP_ENABLED',
  'NMS_BACKUP_ENABLED',
  'WEBSOCKETS_ENABLED',
];
export function buildUIConfig(req: Request): UIConfig {
  // construct config JSON to inject
  const configObj = {
    env: ({}: $Shape<UIEnv>),
    networks: getAllNetworkConfigs(),
    user: req.user,
    version: process.env.npm_package_version,
  };

  // validate ENVs
  const validateEnv = (key, value) => {
    // verify tile style url format
    if (key === 'TILE_STYLE') {
      const tileStyleList = value?.split(',') ?? [];
      if (tileStyleList === 0) {
        logger.error('Tile style URL ENV invalid, using default tiles');
        return false;
      }
      let validStyleList = true;
      tileStyleList.forEach(tileStyle => {
        const tileNameAndStyle = tileStyle.split('=');
        if (tileNameAndStyle.length !== 2) {
          logger.error(
            'Invalid tile style: "' +
              tileStyle +
              '", expecting format <NAME>=<STYLE URL>',
          );
          validStyleList = false;
        }
      });
      return validStyleList;
    }
    return true;
  };
  envKeys.forEach(key => {
    if (process.env.hasOwnProperty(key) && validateEnv(key, process.env[key])) {
      configObj.env[key] = process.env[key] ?? '';
    }
  });
  return configObj;
}
