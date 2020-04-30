/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import axios from 'axios';
import type {SettingTest, TestResult} from '../../shared/dto/Settings';

export const TESTER = {
  MYSQL: 'MYSQL',
  SOFTWARE_PORTAL: 'SOFTWARE_PORTAL',
  ALARMS: 'ALARMS',
};

export const TESTER_MAP: {[$Values<typeof TESTER>]: SettingTest} = {
  [TESTER.MYSQL]: async config => {
    const {MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASS, MYSQL_DB} = config;
    const Sequelize = require('sequelize').default;
    const sequelize = new Sequelize(MYSQL_DB, MYSQL_USER, MYSQL_PASS, {
      host: MYSQL_HOST,
      port: parseInt(MYSQL_PORT),
      dialect: 'mysql',
    });
    await sequelize.authenticate();
    return {
      success: true,
      message: 'Connected to database successfully',
    };
  },
  [TESTER.SOFTWARE_PORTAL]: async config => {
    const {
      SOFTWARE_PORTAL_URL,
      SOFTWARE_PORTAL_API_TOKEN,
      SOFTWARE_PORTAL_API_ID,
    } = config;
    const response = await axios.post<{}, string>(
      `${SOFTWARE_PORTAL_URL}/list`,
      {
        api_token: SOFTWARE_PORTAL_API_TOKEN,
        api_id: SOFTWARE_PORTAL_API_ID,
        suite: 'tg_firmware_rev5',
      },
    );
    if (response.status === 200) {
      return {
        success: true,
        message: 'Connected to software portal successfully',
      };
    }
    return {
      success: false,
      message: response.data,
    };
  },

  [TESTER.ALARMS]: async _config => {
    const {
      PROMETHEUS_CONFIG_URL,
      ALERTMANAGER_CONFIG_URL,
      ALERTMANAGER_URL,
      TG_ALARM_URL,
    } = _config;
    const results = await Promise.all([
      testResult(
        () => axios.get(`${ALERTMANAGER_CONFIG_URL}/v1/tg/route`),
        'Alertmanager Configurer',
      ),
      testResult(
        () => axios.get(`${PROMETHEUS_CONFIG_URL}/v1/tg/alert`),
        'Prometheus Configurer',
      ),
      testResult(
        () => axios.get(`${ALERTMANAGER_URL}/api/v1/alerts`),
        'Alertmanager',
      ),
      testResult(
        () => axios.get(`${TG_ALARM_URL}/rules`),
        'Terragraph Event Alarms',
      ),
    ]);

    const errorMessages = results
      .filter(res => !res.success)
      .map(res => res.message);
    if (errorMessages.length > 0) {
      throw new Error(`${errorMessages.join('. ')}`);
    }

    return {
      success: true,
      message: 'Alarm services connected successfully',
    };
  },
};

/**
 * Make a request and tag the error response with a label so the user knows
 * which service failed.
 */
async function testResult(
  makeReq: () => Promise<*>,
  name: string,
): Promise<TestResult> {
  try {
    await makeReq();
    return {
      success: true,
      message: `${name} succeeded`,
    };
  } catch (error) {
    return {
      success: false,
      message: `${name}: ${error.message}`,
    };
  }
}
