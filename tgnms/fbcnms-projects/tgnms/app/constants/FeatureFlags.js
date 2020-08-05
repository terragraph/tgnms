/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * Should only be used to flag features on/off. Don't use this file for
 * providing configuration values to the frontend.
 */

export const FeatureFlags: {[string]: () => boolean} = {
  NETWORK_TEST_ENABLED: () => !!window.CONFIG?.env?.NETWORKTEST_HOST,
  SCANSERVICE_ENABLED: () =>
    window.CONFIG.env.hasOwnProperty('SCANSERVICE_ENABLED')
      ? window.CONFIG.env.SCANSERVICE_ENABLED === 'true'
      : false,
  NOTIFICATION_MENU_ENABLED: () =>
    !!window.CONFIG?.env.NOTIFICATION_MENU_ENABLED,
  LOGIN_ENABLED: () => window.CONFIG?.env?.LOGIN_ENABLED,
  GRAFANA_ENABLED: () => window.CONFIG.env.hasOwnProperty('GRAFANA_URL'),
  SERVICE_AVAILABILITY_ENABLED: () =>
    window.CONFIG.env.SERVICE_AVAILABILITY_ENABLED === 'true',
  SOFTWARE_PORTAL_ENABLED: () =>
    window.CONFIG?.env?.SOFTWARE_PORTAL_ENABLED === 'true',
  ALARMS_ENABLED: () => window.CONFIG.env.ALARMS_ENABLED,
  DEFAULT_ROUTES_HISTORY_ENABLED: () =>
    window.CONFIG.env.DEFAULT_ROUTES_HISTORY_ENABLED,
  JSON_CONFIG_ENABLED: () =>
    window.CONFIG.env.hasOwnProperty('JSON_CONFIG_ENABLED')
      ? window.CONFIG.env.JSON_CONFIG_ENABLED === 'true'
      : true,
  MAP_HISTORY_ENABLED: () =>
    window.CONFIG.env.hasOwnProperty('MAP_HISTORY_ENABLED')
      ? window.CONFIG.env.MAP_HISTORY_ENABLED === 'true'
      : true,
  NMS_SETTINGS_ENABLED: () =>
    typeof window.CONFIG.env['NMS_SETTINGS_ENABLED'] === 'string' &&
    window.CONFIG.env['NMS_SETTINGS_ENABLED'] !== 'false',
  MAP_ANNOTATIONS_ENABLED: () =>
    typeof window.CONFIG.env['MAP_ANNOTATIONS_ENABLED'] === 'string' &&
    window.CONFIG.env['MAP_ANNOTATIONS_ENABLED'] === 'true',
  TASK_BASED_CONFIG_ENABLED: () =>
    typeof window.CONFIG.env['TASK_BASED_CONFIG_ENABLED'] === 'string' &&
    window.CONFIG.env['TASK_BASED_CONFIG_ENABLED'] !== 'false',
  GET_SYSDUMP_ENABLED: () =>
    typeof window.CONFIG.env['GET_SYSDUMP_ENABLED'] === 'string' &&
    window.CONFIG.end['GET_SYSDUMP_ENABLED'] === 'true',
};

export function isFeatureEnabled(flag: $Keys<typeof FeatureFlags>): boolean {
  return FeatureFlags[flag]();
}
