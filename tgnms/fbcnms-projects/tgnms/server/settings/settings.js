/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import SettingsEngine from './SettingsEngine';
import {TESTER} from './settingsTesters';
import type {EnvMap, SettingDefinition} from '../../shared/dto/Settings';

const settings = new SettingsEngine();
export const SETTINGS: Array<SettingDefinition> = [
  {
    key: 'PORT',
    required: true,
    dataType: 'INT',
    defaultValue: 8080,
    requiresRestart: true,
  },
  {
    key: 'API_REQUEST_TIMEOUT',
    required: false,
    dataType: 'INT',
    defaultValue: 5000,
    requiresRestart: false,
  },
  {
    key: 'LOG_LEVEL',
    required: false,
    dataType: 'STRING',
    defaultValue: 'info',
    requiresRestart: true,
  },
  {
    key: 'LOGIN_ENABLED',
    required: true,
    dataType: 'BOOL',
    defaultValue: true,
    requiresRestart: true,
  },
  {
    key: 'MYSQL_DB',
    required: true,
    dataType: 'STRING',
    defaultValue: '',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_HOST',
    required: true,
    dataType: 'STRING',
    defaultValue: '',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_PASS',
    required: true,
    dataType: 'SECRET_STRING',
    defaultValue: '',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_PORT',
    required: true,
    dataType: 'STRING',
    defaultValue: '',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'MYSQL_USER',
    required: true,
    dataType: 'STRING',
    defaultValue: '',
    requiresRestart: true,
    tester: TESTER.MYSQL,
  },
  {
    key: 'DS_INTERVAL_SEC',
    required: false,
    dataType: 'INT',
    defaultValue: 30,
    requiresRestart: true,
  },
  {
    key: 'NODEUPDATE_SERVER_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
  },
  {
    key: 'NODEUPDATE_AUTH_TOKEN',
    required: false,
    dataType: 'SECRET_STRING',
    requiresRestart: true,
  },
  {
    key: 'SOFTWARE_PORTAL_ENABLED',
    required: false,
    dataType: 'BOOL',
    requiresRestart: true,
    defaultValue: false,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'SOFTWARE_PORTAL_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'SOFTWARE_PORTAL_API_ID',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'SOFTWARE_PORTAL_API_TOKEN',
    required: false,
    dataType: 'SECRET_STRING',
    requiresRestart: true,
    tester: TESTER.SOFTWARE_PORTAL,
  },
  {
    key: 'ALARMS_ENABLED',
    required: false,
    dataType: 'BOOL',
    requiresRestart: true,
    tester: TESTER.ALARMS,
  },
  {
    key: 'PROMETHEUS_CONFIG_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'ALERTMANAGER_CONFIG_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'ALERTMANAGER_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'TG_ALARM_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.ALARMS,
    validations: ['URL'],
  },
  {
    key: 'KEYCLOAK_REALM',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
  },
  {
    key: 'KEYCLOAK_CLIENT_ID',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
  },
  {
    key: 'KEYCLOAK_CLIENT_SECRET',
    required: false,
    dataType: 'SECRET_STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
  },
  {
    key: 'KEYCLOAK_HOST',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
    validations: ['URL'],
  },
  {
    key: 'KEYCLOAK_HTTP_PROXY',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.KEYCLOAK,
    validations: ['URL'],
  },
  {
    key: 'CLIENT_ROOT_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
  },
  {
    key: 'PROMETHEUS',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
    tester: TESTER.PROMETHEUS,
  },
  {
    key: 'GRAFANA_URL',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    tester: TESTER.GRAFANA,
  },
  {
    key: 'STATS_ALLOWED_DELAY_SEC',
    required: false,
    dataType: 'INT',
    requiresRestart: true,
  },
  {
    key: 'NETWORKTEST_HOST',
    required: false,
    dataType: 'STRING',
    requiresRestart: true,
    validations: ['URL'],
    tester: TESTER.NETWORK_TEST,
  },
  {
    key: 'MAP_ANNOTATIONS_ENABLED',
    required: false,
    dataType: 'BOOL',
    requiresRestart: true,
    validations: [],
  },
];

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
