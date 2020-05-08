/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
import {EMPTY_SETTINGS_STATE} from '../../shared/dto/Settings';
import {TESTER_MAP} from './settingsTesters';
import type {
  EnvMap,
  SettingDefinition,
  SettingsMap,
  SettingsState,
} from '../../shared/dto/Settings';

const NMS_SETTINGS_FILE_KEY = 'NMS_SETTINGS_FILE';
const DISABLE_ENV_FILE_KEY = 'DISABLE_ENV_FILE';
const ENABLE_SETTINGS_FILE_KEY = 'NMS_SETTINGS_ENABLED';
const DISABLE_SETTINGS_FILE_DIFF_KEY = 'DISABLE_SETTINGS_FILE_DIFF';

export const logger = createLogger();

export default class SettingsEngine {
  state: SettingsState = EMPTY_SETTINGS_STATE;
  /**
   * Loads environment variables from .env and settings.json.
   * Existing environment variables are never overwritten.
   */
  initialize = (SETTINGS: Array<SettingDefinition>): SettingsState => {
    logger.debug('configuring nms');
    const processEnvStarting = {...process.env};
    const settings = this._makeSettingsMap(SETTINGS);
    const settingsKeys = Object.keys(settings);
    /**
     * The registered settings which already exist in the environment. These are
     * mainly args passed from the commandline like `LOG_LEVEL=debug yarn start`
     *
     * CLI vars have the highest priority and are never overwritten.
     */
    const cliSettings = this._getSettingValues(
      settingsKeys,
      processEnvStarting,
    );

    if (typeof process.env[DISABLE_ENV_FILE_KEY] === 'undefined') {
      logger.debug('reading from .env file');
      // Parse the env file and assign all variables to process.env
      dotenv.config();
    } else {
      logger.warn('.env file disabled.');
    }
    const dotenvEnv = {...process.env};
    const envFileSettings = this._getSettingValues(settingsKeys, dotenvEnv);
    const settingsFileSettings = this._loadSettingsFileSettings();
    /**
     * Merge the settings from all 3 sources into one JSON object like:
     * {
     *   KEY: "VALUE"
     * }
     *
     * All values are still strings at this point
     */

    const settingsState = this._makeSettings({
      registeredSettings: settings,
      envMaps: {
        initialEnv: cliSettings,
        dotenvEnv: envFileSettings,
        settingsFileEnv: settingsFileSettings,
      },
    });
    this._copySettingsToEnvironment(settingsState.current);
    this._setState(settingsState);
    return settingsState;
  };

  /**
   * Updates the settings file. If any of the settings require an NMS restart,
   * NMS will be restarted. If none of the settings require an NMS restart, the
   * new settings will be applied to the environment.
   * By default, only settings which have been changed will be written.
   */
  update = (newSettings: EnvMap): SettingsState => {
    logger.info('starting settings update');
    const stateCopy = {...this.state};

    let update: EnvMap;
    if (process.env[DISABLE_SETTINGS_FILE_DIFF_KEY] !== 'true') {
      update = this._getEnvMapDiff(stateCopy.current, newSettings);
    } else {
      update = newSettings;
    }
    stateCopy.envMaps.settingsFileEnv = Object.assign(
      {},
      stateCopy.envMaps.settingsFileEnv,
      update,
    );
    const requiresRestart = this.findKeysRequiringRestart(
      Object.keys(update),
      stateCopy.registeredSettings,
    );

    const restartHandler = this._createRestartHandler();
    try {
      const settings = this._makeSettings(stateCopy);
      this._writeSettingsFile(settings);
      this._copySettingsToEnvironment(settings.current);
      this._setState(settings);
      if (requiresRestart) {
        restartHandler.restart();
      }
    } catch (err) {
      logger.error('could not update settings file');
      logger.error(err);
      restartHandler.restart();
    }
    return this.state;
  };
  /**
   * Test a set of setting values against their configured test functions
   */
  test = async (
    testValues: EnvMap,
  ): Promise<{[string]: {message?: string, success: boolean}}> => {
    const settingKeys = Object.keys(testValues);
    logger.info(`testing settings: ${settingKeys.join()}`);
    const env = {...this.state.envMaps.settingsFileEnv, ...testValues};
    const testerKeys = new Set<string>();
    for (const key of settingKeys) {
      const testerKey = this.state?.registeredSettings[key]?.tester;
      if (typeof testerKey === 'string') {
        testerKeys.add(testerKey);
      }
    }
    const results = {};
    for (const key of testerKeys) {
      const tester = TESTER_MAP[key];
      try {
        const result = await tester(env);
        results[key] = result;
      } catch (error) {
        logger.error(error);
        results[key] = {
          success: false,
          message: `${key}: ${error.message || 'Test Failed'}`,
        };
      }
    }
    return results;
  };

  _writeSettingsFile = (settings: SettingsState) => {
    const filePath = this._getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      //TODO: backup the existing file?
    }
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, {recursive: true});
    }
    const fileData = JSON.stringify(settings.envMaps.settingsFileEnv, null, 2);
    fs.writeFileSync(filePath, fileData, {encoding: 'utf8'});
    logger.debug('settings file successfully written');
  };

  _getSettingsFilePath = () => {
    let envVar = process.env[NMS_SETTINGS_FILE_KEY];
    if (typeof envVar !== 'string' || envVar.trim() == '') {
      envVar = 'settings.json';
    }
    const filePath = path.resolve(process.cwd(), envVar);
    return filePath;
  };
  _setState = (newState: SettingsState) => {
    this.state = Object.freeze(newState);
  };
  /**
   * Loads and parses the settings from settings.json
   */
  _loadSettingsFileSettings = (): EnvMap => {
    try {
      const enableSettingsFile = process.env[ENABLE_SETTINGS_FILE_KEY];
      if (
        typeof enableSettingsFile !== 'string' ||
        enableSettingsFile === 'false'
      ) {
        logger.warn('settings file disabled');
        return {};
      }
      const filePath = this._getSettingsFilePath();
      logger.debug(`reading from settings file: ${filePath}`);
      if (!fs.existsSync(filePath)) {
        logger.error(`no settings file found: ${filePath}`);
        return {};
      }
      const fileString = fs.readFileSync(filePath, {encoding: 'utf8'});
      const parsed = JSON.parse(fileString);
      logger.debug(`success reading settings file`);
      return parsed;
    } catch (err) {
      logger.error(err);
      return {};
    }
  };
  _makeSettingsMap = (settings: Array<SettingDefinition>): SettingsMap => {
    const settingsMap: SettingsMap = {};
    for (const setting of settings) {
      const {key} = setting;
      if (settingsMap[key]) {
        logger.error(`Overwriting duplicate settings key: ${key}`);
      }
      settingsMap[key] = setting;
    }
    return settingsMap;
  };
  findKeysRequiringRestart = (
    keys: Array<string>,
    settings: SettingsMap,
  ): boolean => {
    for (const key of keys) {
      const setting = settings[key];
      if (setting.requiresRestart !== false) {
        return true;
      }
    }
    return false;
  };

  /**
   * Properly restarts the NMS whether it's restarted by nodemon after a file
   * change, or manually if running from a non-nodemon environment.
   *
   * Relevant nodemon docs:
   * https://www.npmjs.com/package/nodemon#controlling-shutdown-of-your-script
   */
  _createRestartHandler = () => {
    const RESTART_SIGNAL = 'SIGUSR2';
    let prevent = true;
    /**
     * When NMS writes the settings file, nodemon will attempt to restart NMS.
     * nodemon is configured to watch the settings file because, if the app is
     * run via nodemon, it cannot restart itself using process.exit().
     * Listening to the signal effectively blocks it from stopping the app.
     * Re-transmit the signal if the app should actually restart.
     */
    process.once(RESTART_SIGNAL, handleNodemonSignal);
    function handleNodemonSignal() {
      if (prevent) {
        logger.info('blocking nodemon restart');
        cleanup();
      } else {
        return process.kill(process.pid, RESTART_SIGNAL);
      }
    }
    function restart() {
      prevent = false;
      logger.info('settings updated. restarting...');
      setTimeout(() => {
        logger.error(
          'restart signal timeout exceeded. exiting process may hang...',
        );
        cleanup();
        return process.kill(process.pid, RESTART_SIGNAL);
      }, 1000);
    }
    function cleanup() {
      process.off(RESTART_SIGNAL, handleNodemonSignal);
    }
    return {
      restart,
    };
  };

  /**
   * Create the final SettingsState object.
   */
  _makeSettings = (state: $Shape<SettingsState>): SettingsState => {
    const finalizedSettings = this._createMergedEnvMap(state);
    return Object.freeze({...state, current: finalizedSettings});
  };

  /**
   * Creates the final EnvMap from a SettingsState, merging all the settings
   * in the right order.
   */
  _createMergedEnvMap = (state: SettingsState): EnvMap => {
    const settingsKeys = Object.keys(state.registeredSettings);
    const {dotenvEnv, settingsFileEnv, initialEnv} = state.envMaps;
    const finalizedSettings = this._mergeKeys(
      [dotenvEnv, initialEnv, settingsFileEnv],
      settingsKeys,
    );
    return finalizedSettings;
  };

  /**
   * Merges the elements of `list` into one object. Later elements overwrite
   * previous ones. Only properties in `keys` will be merged.
   */
  _mergeKeys = (list: Array<EnvMap>, keys: Array<string>): EnvMap => {
    const settings = {};
    for (let i = list.length - 1; i >= 0; i--) {
      const map = list[i];
      for (const key of keys) {
        if (
          typeof settings[key] === 'undefined' &&
          typeof map[key] !== 'undefined'
        ) {
          settings[key] = map[key];
        }
      }
    }
    return settings;
  };

  /**
   * Creates an object from obj whose key-value-pairs are registered in the
   * settingsKeys array.
   */
  _getSettingValues = (
    settingsKeys: Array<string>,
    obj: {[string]: string | void},
  ): EnvMap => {
    return settingsKeys.reduce((map, key) => {
      if (typeof obj[key] !== 'undefined') {
        map[key] = obj[key];
      }
      return map;
    }, {});
  };

  _copySettingsToEnvironment = (settings: EnvMap) => {
    for (const key in settings) {
      process.env[key] = settings[key];
    }
  };

  /**
   * Gets the values from mapB which differ from mapA
   */
  _getEnvMapDiff = (mapA: EnvMap, mapB: EnvMap) => {
    const diff = {};
    for (const key in mapB) {
      if (mapA[key] !== mapB[key]) {
        diff[key] = mapB[key];
      }
    }
    return diff;
  };
}

export function createLogger() {
  const winston = require('winston');
  const {colorize, combine, printf, label, splat, timestamp} = winston.format;
  const myFormat = printf(info => {
    return `[${info.label}] ${info.level}: ${info.message}`;
  });
  return winston.createLogger<*>({
    level: process?.env?.LOG_LEVEL ?? 'info',
    format: combine(
      colorize(),
      label({label: 'SETTINGS'}),
      timestamp(),
      splat(),
      myFormat,
    ),
    stderrLevels: ['error', 'warning'],
    transports: [new winston.transports.Console()],
  });
}
