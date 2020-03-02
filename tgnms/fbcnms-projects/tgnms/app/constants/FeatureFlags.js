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
  NOTIFICATION_MENU_ENABLED: () =>
    !!window.CONFIG?.env.NOTIFICATION_MENU_ENABLED,
  LOGIN_ENABLED: () => window.CONFIG?.env?.LOGIN_ENABLED,
  NODELOGS_ENABLED: () => window.CONFIG.env.NODELOGS_ENABLED,
  SAVE_MISSING_TRANSLATIONS: () => window.CONFIG.env.SAVE_MISSING_TRANSLATIONS,
  GRAFANA_ENABLED: () => window.CONFIG.env.hasOwnProperty('GRAFANA_URL'),
  SERVICE_AVAILABILITY_ENABLED: () =>
    window.CONFIG.env.SERVICE_AVAILABILITY_ENABLED === 'true',
  SOFTWARE_PORTAL_ENABLED: () =>
    window.CONFIG.env.hasOwnProperty('SOFTWARE_PORTAL_URL'),
  ALARMS_ENABLED: () => window.CONFIG.env.ALARMS_ENABLED,
  DEFAULT_ROUTES_HISTORY_ENABLED: () =>
    window.CONFIG.env.DEFAULT_ROUTES_HISTORY_ENABLED,
  JSON_CONFIG_ENABLED: () =>
    window.CONFIG.env.hasOwnProperty('JSON_CONFIG_ENABLED')
      ? window.CONFIG.env.JSON_CONFIG_ENABLED === 'true'
      : true,
  MAP_HISTORY_ENABLED: () => window.CONFIG.env.MAP_HISTORY_ENABLED,
};

export function isFeatureEnabled(flag: $Keys<typeof FeatureFlags>): boolean {
  return FeatureFlags[flag]();
}
