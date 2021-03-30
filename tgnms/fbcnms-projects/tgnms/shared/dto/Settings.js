/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

export const DATATYPE = {
  INT: 'INT',
  STRING: 'STRING',
  BOOL: 'BOOL',
  SECRET_STRING: 'SECRET_STRING',
  STRING_ARRAY: 'ARRAY',
};
export const VALIDATION = {
  URL: 'URL',
  PORT: 'PORT',
};
export type TestResult = {success: boolean, message?: string};
export type TestResultMap = {[string]: TestResult};
export type SettingTest = {
  (vals: EnvMap): Promise<TestResult>,
};
type ValidationType = $Values<typeof VALIDATION>;
export type SettingDefinition = Int | Str | Bool | SecretStr | StrArray;
export type Int = {|
  dataType: 'INT',
  defaultValue?: string,
  key: string,
  requiresRestart?: boolean, // defaults to true
  validations?: Array<ValidationType>,
  tester?: string,
|};
export type Str = {|
  dataType: 'STRING',
  defaultValue?: string,
  key: string,
  requiresRestart?: boolean, // defaults to true
  validations?: Array<ValidationType>,
  tester?: string,
|};
export type Bool = {|
  dataType: 'BOOL',
  defaultValue?: string,
  key: string,
  requiresRestart?: boolean, // defaults to true
  validations?: Array<ValidationType>,
  tester?: string,
|};
export type SecretStr = {|
  dataType: 'SECRET_STRING',
  defaultValue?: string,
  key: string,
  requiresRestart?: boolean, // defaults to true
  validations?: Array<ValidationType>,
  tester?: string,
|};
export type StrArray = {|
  dataType: 'STRING_ARRAY',
  defaultValue?: string,
  key: string,
  requiresRestart?: boolean, // defaults to true
  validations?: Array<ValidationType>,
  tester?: string,
|};
export type SettingsMap = {[string]: SettingDefinition};

/**
 * Values which come from the environment and the settings file. These are
 * always strings.
 */
export type EnvMap = {[string]: ?string | void};

/**
 * The final settings state after all merging is complete. "current" contains
 * the current values of the settings.
 */
export type SettingsState = {|
  current: EnvMap,
  registeredSettings: SettingsMap,
  envMaps: {
    defaults: EnvMap,
    initialEnv: EnvMap,
    dotenvEnv: EnvMap,
    settingsFileEnv: EnvMap,
  },
|};

export const Validators = {
  [VALIDATION.URL]: validateURL,
  [VALIDATION.PORT]: validatePort,
  required: validateRequired,
};

function validateURL(val: ?string) {
  // if val is undefined or empty string, let validateRequired handle it
  if (
    typeof val === 'undefined' ||
    (typeof val === 'string' && val.trim() === '')
  ) {
    return true;
  }
  if (typeof val !== 'string') {
    return false;
  }
  /**
   * Parse the url and discard the result
   * If it throws an exception, it's invalid.
   */
  const _parsed = new URL(val);
  return true;
}

function validatePort(val: ?string) {
  const integer = parseInt(val);
  if (isNaN(integer)) {
    return false;
  }
  return integer > 0 && integer <= 65535;
}

function validateRequired(val: ?string) {
  return typeof val === 'string' && val.trim() !== '';
}

export const EMPTY_SETTINGS_STATE: SettingsState = {
  current: {},
  registeredSettings: {},
  envMaps: {defaults: {}, initialEnv: {}, dotenvEnv: {}, settingsFileEnv: {}},
};
