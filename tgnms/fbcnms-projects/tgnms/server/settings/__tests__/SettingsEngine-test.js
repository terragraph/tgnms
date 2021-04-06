/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import SettingsEngine, {logger as settingsLogger} from '../SettingsEngine';
import {SETTINGS} from '../settings';

import type {EnvMap} from '../../../shared/dto/Settings';
import type {JestMockFn} from 'jest';

const EventEmitter = require('events');
const fsMock: JestMockFn = require('fs');

let emitter: EventEmitter;
let signalMock: JestMockFn<*, *>;
let killMock: JestMockFn<*, *>;
jest.mock('fs', () => new (require('memfs').Volume)());
jest.spyOn(fsMock, 'writeFileSync');
/**
 * SettingsEngine spams logs. If logs need to be visible for debugging tests,
 * remove the mock implementations.
 */
const errorLogSpy = jest
  .spyOn(settingsLogger, 'error')
  .mockImplementation(() => {});
const warnLogSpy = jest
  .spyOn(settingsLogger, 'warn')
  .mockImplementation(() => {});
const _infoLogSpy = jest
  .spyOn(settingsLogger, 'info')
  .mockImplementation(() => {});
const OLD_ENV = process.env;
beforeEach(() => {
  jest.useFakeTimers();
  fsMock.mkdirSync('.', {recursive: true});
  process.env = {...OLD_ENV, NMS_SETTINGS_ENABLED: 'true'};
  writeSettingsFile('{}');
  delete process.env.NODE_ENV;
  emitter = new EventEmitter();
  signalMock = jest
    .spyOn(process, 'once')
    .mockImplementation((...args) => emitter.once(...args));
  killMock = jest.spyOn(process, 'kill').mockImplementation(() => {});
});
afterEach(() => {
  fsMock.reset();
  process.env = OLD_ENV;
  jest.resetModules();
});

describe('Settings Engine', () => {
  let settings: SettingsEngine;

  beforeEach(() => {
    settings = new SettingsEngine();
  });
  describe('configure', () => {
    test('reads settings from .env file using dotenv', () => {
      const processEnvBefore = {...process.env};
      writeEnvFile(`API_REQUEST_TIMEOUT=1000`);
      expect(processEnvBefore['API_REQUEST_TIMEOUT']).toBe(undefined);
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter['API_REQUEST_TIMEOUT']).toBe('1000');
    });
    test('settings from .env file do not overwrite existing env vars', () => {
      process.env['DONOTOVERWRITE'] = 'expected-value';
      const processEnvBefore = {...process.env};
      writeEnvFile(
        `API_REQUEST_TIMEOUT=value
      DONOTOVERWRITE=overwritten, fail!`,
      );
      expect(processEnvBefore['DONOTOVERWRITE']).toBe('expected-value');
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter['DONOTOVERWRITE']).toBe('expected-value');
    });
    test('settings from settings file overwrite existing env vars', () => {
      process.env['LOGIN_ENABLED'] = 'false';
      const processEnvBefore = {...process.env};
      writeSettingsFile(
        `{
        "API_REQUEST_TIMEOUT":"value",
        "LOGIN_ENABLED":"settings-file-value"
      }`,
      );
      expect(processEnvBefore['LOGIN_ENABLED']).toBe('false');
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter['LOGIN_ENABLED']).toBe('settings-file-value');
    });
    test('DISABLE_ENV_FILE disables loading from the env file', () => {
      process.env['DISABLE_ENV_FILE'] = '';
      const processEnvBefore = {...process.env};
      writeEnvFile(`API_REQUEST_TIMEOUT=failure`);
      expect(processEnvBefore['API_REQUEST_TIMEOUT']).toBe(undefined);
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter['API_REQUEST_TIMEOUT']).toBe('5000');
      expect(warnLogSpy).toHaveBeenCalled();
    });
    test('NMS_SETTINGS_ENABLED=false disables loading from the settings file', () => {
      process.env['NMS_SETTINGS_ENABLED'] = 'false';
      const processEnvBefore = {...process.env};
      writeSettingsFile(`{"MYSQL_USER":"failure"}`);
      expect(processEnvBefore['MYSQL_USER']).toBe(undefined);
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter['MYSQL_USER']).toBe('');
    });
    test('values from .env file are loaded into process.env', () => {
      writeEnvFile(`
    API_REQUEST_TIMEOUT=1000
    UNREGISTERED_KEY=unregistered
    `);
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter['API_REQUEST_TIMEOUT']).toBe('1000');
      expect(processEnvAfter['UNREGISTERED_KEY']).toBe('unregistered');
    });
    test('invalid settings file logs error and continues', () => {
      writeSettingsFile(`{"API_REQUEST_TIMEOUT":"invalid", bad json...}`);
      expect(errorLogSpy).not.toHaveBeenCalled();
      settings.initialize(SETTINGS);
      expect(process.env['API_REQUEST_TIMEOUT']).toBe('5000');
      expect(errorLogSpy).toHaveBeenCalled();
    });
    test('invalid settings file does not affect settings from env file', () => {
      writeSettingsFile(`{"API_REQUEST_TIMEOUT":"invalid", bad json...}`);
      settings.initialize(SETTINGS);
      expect(process.env['API_REQUEST_TIMEOUT']).toBe('5000');
    });
    test('values from settings file are loaded into process.env', () => {
      const processEnvBefore = {...process.env};
      writeSettingsFile(`{"PORT":"8081"}`);
      expect(processEnvBefore.PORT).toBe(undefined);
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter.PORT).toBe('8081');
    });
    test('values from the settings file overwrite values from .env file', () => {
      const processEnvBefore = {...process.env};
      writeSettingsFile(`{"PORT":"SETTINGS_VAL"}`);
      writeEnvFile(`PORT=ENV_VAL`);
      expect(processEnvBefore.PORT).toBe(undefined);
      settings.initialize(SETTINGS);
      const processEnvAfter = {...process.env};
      expect(processEnvAfter.PORT).toBe('SETTINGS_VAL');
    });
    test('logs error if settings file is specified but not found at startup', () => {
      fsMock.unlinkSync('settings.json');
      expect(fsMock.existsSync('settings.json')).toBe(false);
      expect(warnLogSpy).not.toHaveBeenCalled();
      settings.initialize(SETTINGS);
      expect(warnLogSpy).toHaveBeenCalled();
    });
    test('sets settingsState properly', () => {
      writeSettingsFile(`{"PORT":"8080","API_REQUEST_TIMEOUT":"5000"}`);
      writeEnvFile(`PORT=8081
      API_REQUEST_TIMEOUT=100`);
      settings.initialize(SETTINGS);
      expect(settings.state).toMatchObject({
        current: {
          PORT: '8080',
          API_REQUEST_TIMEOUT: '5000',
        },
        registeredSettings: {
          PORT: {
            key: 'PORT',
            dataType: 'INT',
            defaultValue: '80',
          },
        },
        envMaps: {
          initialEnv: {
            NMS_SETTINGS_ENABLED: 'true',
          },
          dotenvEnv: {
            PORT: '8081',
            API_REQUEST_TIMEOUT: '100',
          },
          settingsFileEnv: {
            PORT: '8080',
            API_REQUEST_TIMEOUT: '5000',
          },
        },
      });
    });
    test('settingsState is frozen', () => {
      writeSettingsFile(`{"PORT":"8080","API_REQUEST_TIMEOUT":"5000"}`);
      settings.initialize(SETTINGS);
      expect(() => {
        const state = settings.state;
        state.current = {};
      }).toThrow();
    });
  });

  describe('updateSettings', () => {
    beforeEach(() => {
      writeSettingsFile(
        `{"PORT":"8080","API_REQUEST_TIMEOUT":"5000","MYSQL_PORT":"3000"}`,
      );
      writeEnvFile(`{"LOGIN_ENABLED":"true"}`);
    });

    test('updates the current settings state', () => {
      const _envBefore = {...process.env};
      settings.initialize(SETTINGS);
      const _envConfigure = {...process.env};
      expect(settings.state).toMatchObject({
        current: {
          PORT: '8080',
          API_REQUEST_TIMEOUT: '5000',
          MYSQL_PORT: '3000',
        },
      });
      settings.update({
        PORT: '8085',
      });
      const newSettingsState = settings.state;
      expect(newSettingsState.current.PORT).toBe('8085');
      expect(newSettingsState.envMaps.settingsFileEnv.PORT).toBe('8085');
    });
    test('updates process.env', () => {
      const envBefore = {...process.env};
      expect(envBefore.PORT).toBe(undefined);
      settings.initialize(SETTINGS);
      settings.update({
        PORT: '8085',
      });
      const envUpdated = {...process.env};
      expect(envUpdated.PORT).toBe('8085');
    });
    test('writes to configured settings json file', () => {
      settings.initialize(SETTINGS);
      settings.update({
        MYSQL_PORT: '3390',
      });
      const fileContents = fsMock.readFileSync('settings.json');
      expect(fileContents).toBeInstanceOf(Buffer);
      expect(JSON.parse(fileContents.toString())).toEqual({
        MYSQL_PORT: '3390',
        API_REQUEST_TIMEOUT: '5000',
        PORT: '8080',
      });
    });
    test('does not write to settings json if value is null', () => {
      settings.initialize(SETTINGS);
      settings.update({
        MYSQL_PORT: null,
      });
      const fileContents = fsMock.readFileSync('settings.json');
      expect(fileContents).toBeInstanceOf(Buffer);
      expect(JSON.parse(fileContents.toString())).toEqual({
        API_REQUEST_TIMEOUT: '5000',
        PORT: '8080',
      });
    });
    test('does not overwrite env vars which came from the CLI environment', () => {
      process.env.MYSQL_USER = 'wrong value';
      settings.initialize(SETTINGS);

      settings.update({
        MYSQL_USER: 'updated',
      });
      const envUpdated = {...process.env};
      expect(envUpdated.MYSQL_USER).toBe('updated');
    });
    test('overwrites env vars which came from .env', () => {
      writeEnvFile('LOGIN_ENABLED=overwrite');
      settings.initialize(SETTINGS);
      settings.update({
        LOGIN_ENABLED: 'true',
      });
      const envUpdated = {...process.env};
      expect(envUpdated.LOGIN_ENABLED).toBe('true');
    });
    test('overwrites env vars which came from settings json file', () => {
      settings.initialize(SETTINGS);
      settings.update({
        MYSQL_USER: 'updated',
      });
      const envUpdated = {...process.env};
      expect(envUpdated.MYSQL_USER).toBe('updated');
    });
    test('if any updated settings require restart, the NMS is restarted', () => {
      settings.initialize(SETTINGS);
      expect(killMock).not.toHaveBeenCalled();
      settings.update({
        MYSQL_USER: 'updated',
      });
      jest.runAllTimers();
      expect(killMock).toHaveBeenCalled();
    });
    test('if no updated settings require restart, no restart occurs', () => {
      settings.initialize(
        SETTINGS.concat({
          key: 'NO_RESTART_NEEDED',
          dataType: 'INT',
          defaultValue: '5000',
          requiresRestart: false,
        }),
      );
      expect(killMock).not.toHaveBeenCalled();
      settings.update({
        NO_RESTART_NEEDED: '2000',
      });
      jest.runAllTimers();
      expect(killMock).not.toHaveBeenCalled();
    });
    test('creates settings file if it does not already exist', () => {
      fsMock.unlinkSync('settings.json');
      expect(fsMock.existsSync('settings.json')).toBe(false);
      settings.initialize(SETTINGS);
      settings.update({
        API_REQUEST_TIMEOUT: '2000',
      });
      expect(fsMock.existsSync('settings.json')).toBe(true);
    });
    test('creates settings directory path if it does not exist', () => {
      const newpath = 'new/settings/path/settings.json';
      fsMock.unlinkSync('settings.json');
      expect(fsMock.existsSync('settings.json')).toBe(false);
      expect(fsMock.existsSync(newpath)).toBe(false);
      process.env['NMS_SETTINGS_FILE'] = newpath;
      settings.initialize(SETTINGS);
      settings.update({
        API_REQUEST_TIMEOUT: '2000',
      });
      expect(fsMock.existsSync(newpath)).toBe(true);
    });
    test('only writes settings which are different from existing environment', () => {
      // overwrite settings file to prevent merge
      writeSettingsFile('{}');
      settings.initialize(SETTINGS);
      settings.update({
        MYSQL_USER: 'test',
      });
      const fileData = JSON.parse(
        fsMock.readFileSync('settings.json', {encoding: 'utf8'}).toString(),
      );
      expect(fileData).toMatchObject({
        MYSQL_USER: 'test',
      });
    });
  });

  describe('helpers', () => {
    describe('_makeSettingsMap', () => {
      test('logs errors and overwrites duplicate keys', () => {
        expect(errorLogSpy).not.toHaveBeenCalled();
        const settingsMap = settings._makeSettingsMap([
          {
            key: 'PORT',
            dataType: 'INT',
            defaultValue: '8080',
          },
          {
            key: 'PORT',
            dataType: 'STRING',
            defaultValue: '',
          },
        ]);
        expect(settingsMap).toEqual({
          PORT: {
            key: 'PORT',
            dataType: 'STRING',
            defaultValue: '',
          },
        });
        expect(errorLogSpy).toHaveBeenCalled();
      });
    });
    describe('merge settings', () => {
      test('last settings arg is highest precedence', () => {
        const envFile: EnvMap = {
          KEY1: 'VAL1',
          KEY2: 'VAL2',
          KEY3: 'VAL3',
        };
        const cliArg: EnvMap = {
          KEY1: 'VAL1-cli',
        };
        expect(
          settings._mergeKeys([envFile, cliArg], ['KEY1', 'KEY2', 'KEY3']),
        ).toEqual({
          KEY1: 'VAL1-cli',
          KEY2: 'VAL2',
          KEY3: 'VAL3',
        });
      });
      test('only registered settings are copied out', () => {
        const envFile: EnvMap = {
          KEY1: 'VAL1',
          KEY2: 'VAL2',
          UNKNOWNKEY: 'UNKNOWNVAL',
        };
        const cliArg: EnvMap = {
          KEY1: 'VAL1-cli',
        };
        expect(
          settings._mergeKeys([envFile, cliArg], ['KEY1', 'KEY2']),
        ).toEqual({
          KEY1: 'VAL1-cli',
          KEY2: 'VAL2',
        });
      });
      test('null values are ignored', () => {
        const envFile: EnvMap = {
          KEY1: 'VAL1',
          KEY2: 'VAL2',
        };
        /**
         * though cli has higher precedence, it is explicitly null
         * and will be ignored.
         */
        const cliArg: EnvMap = {
          KEY1: null,
        };
        expect(
          settings._mergeKeys([envFile, cliArg], ['KEY1', 'KEY2']),
        ).toEqual({
          KEY1: 'VAL1',
          KEY2: 'VAL2',
        });
      });
    });
  });

  describe('restart', () => {
    test(
      'if NMS receives the SIGUSR2 signal, it is being hosted by nodemon ' +
        'and should restart using a signal',
      () => {
        expect(signalMock).not.toHaveBeenCalled();
        expect(killMock).not.toHaveBeenCalled();
        const restarter = settings._createRestartHandler();
        expect(signalMock).toHaveBeenCalled();
        expect(killMock).not.toHaveBeenCalled();
        restarter.restart();
        emitter.emit('SIGUSR2');
        jest.runAllTimers();
        expect(signalMock).toHaveBeenCalled();
        expect(killMock).toHaveBeenCalled();
      },
    );
    test(
      'if NMS fails to receive SIGUSR2 signal, it is running without nodemon' +
        'and must restart itself',
      () => {
        expect(signalMock).not.toHaveBeenCalled();
        expect(killMock).not.toHaveBeenCalled();
        expect(killMock).not.toHaveBeenCalled();
        const restarter = settings._createRestartHandler();
        expect(signalMock).toHaveBeenCalled();
        expect(killMock).not.toHaveBeenCalled();
        expect(killMock).not.toHaveBeenCalled();
        restarter.restart();
        jest.runAllTimers();
        expect(killMock).toHaveBeenCalled();
      },
    );
  });
});

function writeEnvFile(fileData: string) {
  return fsMock.writeFileSync('.env', fileData, {encoding: 'utf8'});
}

function writeSettingsFile(fileData: string) {
  return fsMock.writeFileSync('settings.json', fileData, {encoding: 'utf8'});
}
