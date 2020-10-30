/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import axios from 'axios';
import type {Client as OpenidClient} from 'openid-client';
import type {SettingTest, TestResult} from '../../shared/dto/Settings';

export const TESTER = {
  MYSQL: 'MYSQL',
  SOFTWARE_PORTAL: 'SOFTWARE_PORTAL',
  ALARMS: 'ALARMS',
  KEYCLOAK: 'KEYCLOAK',
  PROMETHEUS: 'PROMETHEUS',
  GRAFANA: 'GRAFANA',
  KIBANA: 'KIBANA',
  NETWORK_TEST: 'NETWORK_TEST',
  SCANSERVICE: 'SCANSERVICE',
  DEFAULT_ROUTES_HISTORY: 'DEFAULT_ROUTES_HISTORY',
};

export const TESTER_MAP: {[$Values<typeof TESTER>]: SettingTest} = {
  [TESTER.MYSQL]: async config => {
    const {MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASS, MYSQL_DB} = config;
    const Sequelize = require('sequelize').default;
    const sequelize = new Sequelize(
      MYSQL_DB ?? '',
      MYSQL_USER ?? '',
      MYSQL_PASS ?? '',
      {
        host: MYSQL_HOST ?? '',
        port: parseInt(MYSQL_PORT),
        dialect: 'mysql',
      },
    );
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
      `${SOFTWARE_PORTAL_URL ?? ''}/list`,
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
        () => axios.get(`${ALERTMANAGER_CONFIG_URL ?? ''}/v1/tg/route`),
        'Alertmanager Configurer',
      ),
      testResult(
        () => axios.get(`${PROMETHEUS_CONFIG_URL ?? ''}/v1/tg/alert`),
        'Prometheus Configurer',
      ),
      testResult(
        () => axios.get(`${ALERTMANAGER_URL ?? ''}/api/v1/alerts`),
        'Alertmanager',
      ),
      testResult(
        () => axios.get(`${TG_ALARM_URL ?? ''}/rules`),
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
  [TESTER.KEYCLOAK]: async config => {
    const {
      KEYCLOAK_REALM,
      KEYCLOAK_CLIENT_ID,
      KEYCLOAK_CLIENT_SECRET,
      KEYCLOAK_HOST,
    } = config;

    const {Issuer: OpenidIssuer} = require('openid-client');
    const {makeKeycloakURL} = require('../user/oidc');
    const issuerUrl = makeKeycloakURL({
      KEYCLOAK_HOST: KEYCLOAK_HOST ?? '',
      KEYCLOAK_REALM: KEYCLOAK_REALM ?? '',
    }).toString();
    /**
     * TODO: test KEYCLOAK_HTTP_PROXY T63546077
     * Not testing KEYCLOAK_HTTP_PROXY currently since it would overwrite the
     * global proxy setting.
     */
    const issuer = await OpenidIssuer.discover(issuerUrl);
    const openidClient: OpenidClient = new issuer.Client({
      client_id: KEYCLOAK_CLIENT_ID ?? '',
      client_secret: KEYCLOAK_CLIENT_SECRET ?? '',
    });

    const grant = await openidClient.grant({
      grant_type: 'client_credentials',
    });
    if (!grant && typeof grant.access_token !== 'string') {
      return {
        success: false,
        message: 'OAuth grant failed. Users may have trouble logging in.',
      };
    }
    return {success: true, message: 'Success!'};
  },
  [TESTER.PROMETHEUS]: async config => {
    const {PROMETHEUS} = config;
    const response = await axios.get(
      `${PROMETHEUS ?? ''}/api/v1/query?query=up`,
    );
    if (!response.data || response.data?.status !== 'success') {
      return {success: false, message: 'Invalid Prometheus response'};
    }
    return {success: true, message: 'Success!'};
  },
  [TESTER.GRAFANA]: async config => {
    const {GRAFANA_URL} = config;
    const response = await axios.get(
      `${GRAFANA_URL ?? ''}/api/dashboards/home`,
    );
    if (!response.data || !response.data.meta) {
      return {success: false, message: 'Invalid Grafana response'};
    }
    return {success: true, message: 'Success!'};
  },
  [TESTER.KIBANA]: async config => {
    const {KIBANA_URL} = config;
    const response = await axios.get(
      `${KIBANA_URL ?? ''}/kibana/app/kibana#/discover?_g=(filters:!())`,
    );
    if (!response.data || !response.data.meta) {
      return {success: false, message: 'Invalid Kibana response'};
    }
    return {success: true, message: 'Success!'};
  },
  [TESTER.NETWORK_TEST]: async config => {
    const {NETWORKTEST_HOST} = config;
    await axios.get(`${NETWORKTEST_HOST ?? ''}/schedule`);
    return {success: true, message: 'Success!'};
  },
  [TESTER.SCANSERVICE]: async config => {
    const {SCANSERVICE_HOST} = config;
    await axios.get(`${SCANSERVICE_HOST ?? ''}/status`);
    return {success: true, message: 'Success!'};
  },
  [TESTER.DEFAULT_ROUTES_HISTORY]: async config => {
    const {DEFAULT_ROUTES_HISTORY_HOST} = config;
    await axios.get(`${DEFAULT_ROUTES_HISTORY_HOST ?? ''}/status`);
    return {success: true, message: 'Success!'};
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
