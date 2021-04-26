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
import type {MapStyle, UIConfig, UIEnv} from '../../shared/dto/UI';
import type {Request} from '../types/express';
import type {UIFeatureFlags} from '../../shared/FeatureFlags';

// define which env keys to add to config
const envKeys: Array<$Keys<UIEnv>> = [
  'GRAFANA_URL',
  'KIBANA_URL',
  'ELASTIC_URL',
  'MAPBOX_ACCESS_TOKEN',
  'ISSUES_URL',
  'COMMIT_DATE',
  'COMMIT_HASH',
  'DOC_URL',
];
export function buildUIConfig(req: Request): UIConfig {
  // construct config JSON to inject
  const featureFlags = makeFeatureFlags(process.env);
  const uiEnv = makeUIEnv(process.env);
  const configObj = {
    env: uiEnv,
    networks: getAllNetworkConfigs(),
    user: req.user,
    version: process.env.npm_package_version,
    featureFlags: featureFlags,
    mapStyles: makeMapStyles(featureFlags, uiEnv),
  };
  return configObj;
}

export function makeMapStyles(
  featureFlags: UIFeatureFlags,
  uiEnv: UIEnv,
): Array<MapStyle> {
  const {FACEBOOK_MAPSTYLE_URL, TILE_STYLE} = process.env;
  let styles: Array<MapStyle> = [];

  if (featureFlags.MAPSTYLE_MAPBOX_ENABLED === true) {
    if (
      typeof uiEnv.MAPBOX_ACCESS_TOKEN === 'string' &&
      uiEnv.MAPBOX_ACCESS_TOKEN.trim() !== ''
    ) {
      const baseUrl = 'mapbox://styles/mapbox/';
      styles = styles.concat([
        {
          name: 'Streets',
          url: baseUrl + 'streets-v10',
        },
        {
          name: 'Satellite',
          url: baseUrl + 'satellite-streets-v10',
        },
      ]);
    } else {
      logger.error(
        'MAPBOX_ACCESS_TOKEN is missing' +
          ' but Mapbox is enabled (MAPSTYLE_MAPBOX_ENABLED)',
      );
    }
  }

  const invalidEnv = () => {
    logger.error('Invalid TILE_STYLE setting: ' + (TILE_STYLE ?? ''));
  };
  const invalidStyle = style =>
    logger.error(
      'Invalid tile style: "' +
        style +
        '", expecting format <NAME>=<STYLE URL>',
    );
  /**
   * TILE_STYLE is formatted like:
   * "Style Name=https://styleurl.com/test?v=5,Name 2=..."
   */
  if (typeof TILE_STYLE === 'string' && TILE_STYLE.trim() != '') {
    const pairs = TILE_STYLE.split(',');
    if (pairs.length < 1) {
      invalidEnv();
    } else {
      for (const style of pairs) {
        const eqIdx = style.indexOf('=');
        if (eqIdx < 0) {
          invalidStyle(style);
          continue;
        }
        const tileName = style.slice(0, eqIdx);
        const tileURL = style.slice(eqIdx + 1);
        if (tileName.trim() === '' || tileURL.trim() === '') {
          invalidStyle(style);
          continue;
        }
        styles.push({
          name: tileName,
          url: tileURL,
        });
      }
    }
  }

  if (featureFlags.MAPSTYLE_FACEBOOK_ENABLED === true) {
    styles.push({
      name: 'Facebook',
      url: FACEBOOK_MAPSTYLE_URL ?? '',
    });
  }

  return styles;
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

function makeUIEnv(env: {|[string]: string | void|}): UIEnv {
  const configObj = ({}: $Shape<UIEnv>);
  envKeys.forEach(key => {
    if (env.hasOwnProperty(key)) {
      configObj[key] = env[key] ?? '';
    }
  });
  return configObj;
}
