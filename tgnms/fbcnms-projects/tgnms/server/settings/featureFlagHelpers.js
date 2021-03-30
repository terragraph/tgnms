/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Should only be used to flag features on/off. Don't use this file for
 * providing configuration values to the frontend.
 */
import {envBool} from '../helpers/configHelpers';
import type {
  FeatureFlagDef,
  FeatureFlagKey,
  UIFeatureFlags,
} from '../../shared/FeatureFlags';
import type {SettingDefinition} from '../../shared/dto/Settings';

export function mapFromFeatureFlags(flags: {|
  [FeatureFlagKey]: FeatureFlagDef,
|}): Array<SettingDefinition> {
  return Object.keys(flags).map(key => ({
    key,
    dataType: 'BOOL',
    defaultValue: flags[key]?.isDefaultEnabled?.toString(),
    requiresRestart: true,
  }));
}

/**
 * Convert from FEATURE_FLAGS + current env to a simple {flag-key:boolean}
 */
export function makeFeatureFlags(
  featureFlags: {|
    [FeatureFlagKey]: FeatureFlagDef,
  |},
  env: {|
    [string]: string | void,
  |},
): UIFeatureFlags {
  const flags: UIFeatureFlags = {};
  for (const envKey in featureFlags) {
    const flagDef = featureFlags[envKey];
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
      }
    }
  }
  return flags;
}
