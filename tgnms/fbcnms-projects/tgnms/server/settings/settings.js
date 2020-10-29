/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import SettingsEngine, {mapFromFeatureFlags} from './SettingsEngine';
import {FEATURE_FLAGS} from '../../shared/FeatureFlags';
import {TESTER} from './settingsTesters';
import type {EnvMap, SettingDefinition} from '../../shared/dto/Settings';

export const SETTINGS: Array<SettingDefinition> = [
  {
    key: 'PORT',
    dataType: 'INT',
    defaultValue: '80',
    requiresRestart: true,
  },
  {
    key: 'API_REQUEST_TIMEOUT',
    dataType: 'INT',
    defaultValue: '5000',
    requiresRestart: false,
  },
  {
    key: 'LOG_LEVEL',
    dataType: 'STRING',
    defaultValue: 'info',
    requiresRestart: true,
  },
  {
    key: 'MYSQL_DB',
    dataType: 'STRING',
    defaultValue: 'cxl',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_HOST',
    dataType: 'STRING',
    defaultValue: 'db',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_PASS',
    dataType: 'SECRET_STRING',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_PORT',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_USER',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'DS_INTERVAL_SEC',
    dataType: 'INT',
    defaultValue: '30',
    requiresRestart: true,
  },
  {
    key: 'NODEUPDATE_SERVER_URL',
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
  },
  {
    key: 'NODEUPDATE_AUTH_TOKEN',
    dataType: 'SECRET_STRING',
    requiresRestart: true,
  },
  {
    key: 'SOFTWARE_PORTAL_ENABLED',
    dataType: 'BOOL',
    requiresRestart: true,
    defaultValue: 'false',
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'SOFTWARE_PORTAL_URL',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'SOFTWARE_PORTAL_API_ID',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'SOFTWARE_PORTAL_API_TOKEN',
    dataType: 'SECRET_STRING',
    requiresRestart: true,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'PROMETHEUS_CONFIG_URL',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'ALERTMANAGER_CONFIG_URL',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'ALERTMANAGER_URL',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'TG_ALARM_URL',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'KEYCLOAK_REALM',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
  },
  {
    key: 'KEYCLOAK_CLIENT_ID',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
  },
  {
    key: 'KEYCLOAK_CLIENT_SECRET',
    dataType: 'SECRET_STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
  },
  {
    key: 'KEYCLOAK_HOST',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
    validations: ['URL'],
  },
  {
    key: 'KEYCLOAK_HTTP_PROXY',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
    validations: ['URL'],
  },
  {
    key: 'CLIENT_ROOT_URL',
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
  },
  {
    key: 'PROMETHEUS',
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
    tester: TESTER.PROMETHEUS,
  },
  {
    key: 'GRAFANA_URL',
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.GRAFANA,
    defaultValue: '/grafana',
  },
  {
    key: 'STATS_ALLOWED_DELAY_SEC',
    dataType: 'INT',
    requiresRestart: true,
  },
  {
    key: 'NETWORKTEST_HOST',
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
    tester: TESTER.NETWORK_TEST,
  },
  {
    key: 'DEFAULT_ROUTES_HISTORY_HOST',
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
    tester: TESTER.DEFAULT_ROUTES_HISTORY,
  },
  {
    key: 'SCANSERVICE_HOST',
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
    tester: TESTER.SCANSERVICE,
  },
  ...mapFromFeatureFlags(FEATURE_FLAGS),
];

const settings = new SettingsEngine();
/**
 * Read the settings files and load the data into the environment.
 */
export function initialize() {
  return settings.initialize(SETTINGS);
}

/**
 * Get the list of registered settings and their current values
 */
export function getSettingsState() {
  return settings.state;
}

/**
 * Modify the settings file and restart the NMS
 */
export function updateSettings(newSettings: EnvMap) {
  return settings.update(newSettings);
}

export function testSettings(testValues: EnvMap) {
  return settings.test(testValues);
}

export default settings;
