/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const logger = require('../log')(module);
const {getAllNetworkConfigs} = require('../topology/model');
import {FEATURE_FLAGS} from '../../shared/FeatureFlags';
import {envBool} from '../helpers/configHelpers';
import type {Request} from '../types/express';
import type {UIConfig, UIEnv, UIFeatureFlags} from '../../shared/dto/UI';

// define which env keys to add to config
const envKeys: Array<$Keys<UIEnv>> = [
  'GRAFANA_URL',
  'MAPBOX_ACCESS_TOKEN',
  'ISSUES_URL',
  'TILE_STYLE',
  'COMMIT_DATE',
  'COMMIT_HASH',
  'DOC_URL',
];
export function buildUIConfig(req: Request): UIConfig {
  // construct config JSON to inject
  const configObj = {
    env: ({}: $Shape<UIEnv>),
    networks: getAllNetworkConfigs(),
    user: req.user,
    version: process.env.npm_package_version,
    featureFlags: makeFeatureFlags(process.env),
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

export function makeFeatureFlags(env: {|
  [string]: string | void,
|}): UIFeatureFlags {
  const flags: UIFeatureFlags = {};
  for (const envKey in FEATURE_FLAGS) {
    const flagDef = FEATURE_FLAGS[envKey];
    const envVal = env[envKey];
    if (typeof flagDef.customFlag === 'function') {
      flags[envKey] = flagDef.customFlag(env);
    } else {
      const type = typeof envVal;
      switch (type) {
        case 'undefined':
          flags[envKey] = flagDef.isDefaultEnabled;
          break;
        case 'string':
          flags[envKey] = envBool(envVal);
          break;
        default:
          logger.error(`invalid env type: ${type}`);
      }
    }
  }
  return flags;
}
