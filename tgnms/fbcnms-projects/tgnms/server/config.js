/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const {optionalInt, requiredInt} = require('./helpers/configHelpers');
const {isFeatureEnabled} = require('@fbcnms/tg-nms/server/settings/settings');

const API_REQUEST_TIMEOUT = requiredInt(process.env.API_REQUEST_TIMEOUT, 12000);

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOGIN_ENABLED = isFeatureEnabled('LOGIN_ENABLED');
const SSO_ENABLED = isFeatureEnabled('SSO_ENABLED');
const SESSION_MAX_AGE_MS = optionalInt(process.env.SESSION_MAX_AGE_MS);
const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = process.env.MYSQL_PORT || '3306';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASS = process.env.MYSQL_PASS || '';
const MYSQL_DB = process.env.MYSQL_DB || 'cxl';
const IS_KUBERNETES = !!process.env.KUBERNETES_SERVICE_HOST;
const SQLITE_DB = process.env.SQLITE_DB;

const HW_PROFILES_BASE_DIR = process.env.HW_PROFILES_BASE_DIR;

const NETWORKTEST_HOST =
  process.env.NETWORKTEST_HOST || 'http://network_test:8080';
const SCANSERVICE_HOST =
  process.env.SCANSERVICE_HOST || 'http://scan_service:8080';
const TOPOLOGY_HISTORY_HOST =
  process.env.TOPOLOGY_HISTORY_HOST || 'http://topology_service:8080';

const PROXY_ENABLED = process.env.http_proxy && process.env.http_proxy.length;

/**
 * If you're connecting to openid connect through a proxy, and that proxy is
 * different than the one used to connect to the lab network, specify this
 * option. Otherwise it will fall back to the default http_proxy
 **/
const KEYCLOAK_HTTP_PROXY = process.env.KEYCLOAK_HTTP_PROXY
  ? process.env.KEYCLOAK_HTTP_PROXY
  : process.env.http_proxy
  ? process.env.http_proxy
  : undefined;

const NETWORK_PROVISIONING_FILE = process.env.NETWORK_PROVISIONING_FILE;

const KEYCLOAK_HOST = process.env.KEYCLOAK_HOST;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
const CLIENT_ROOT_URL = process.env.CLIENT_ROOT_URL;

const PROMETHEUS_URL = process.env.PROMETHEUS || 'http://prometheus:9090';
// default data source interval to use
const DS_INTERVAL_SEC = 30;

// fix to a stable docker api version (https://docs.docker.com/engine/api/v1.37/)
const DOCKER_API_VERSION = '1.37';

// URL and auth token for Terragraph's software portal
const SOFTWARE_PORTAL_ENABLED = isFeatureEnabled('SOFTWARE_PORTAL_ENABLED');
const SOFTWARE_PORTAL_URL =
  process.env.SOFTWARE_PORTAL_URL || 'https://sw.terragraph.link';
const SOFTWARE_PORTAL_API_TOKEN =
  process.env.SOFTWARE_PORTAL_API_TOKEN || 'K__AjuA9ii_Mwq7FYV00PWS-e6Y';
const SOFTWARE_PORTAL_API_ID = process.env.SOFTWARE_PORTAL_API_ID || 'tgdev';

// Default time window to cache link health for
const LINK_HEALTH_TIME_WINDOW_HOURS = 24;

const DEVELOPMENT = process.env.NODE_ENV !== 'production';

// comma separated list of kafka hosts
// structure:
//   'kafka-host1:9092,kafka-host2:9092'
const KAFKA_HOSTS = process.env.KAFKA_HOSTS;

// AlertManager and associated services to manager alert-related configs
const ALERTMANAGER_URL =
  process.env.ALERTMANAGER_URL || 'http://alertmanager:9093';
// Prometheus config writing utils are within the same docker container
const PROMETHEUS_CONFIG_URL =
  process.env.PROMETHEUS_CONFIG_URL || 'http://prometheus_configurer:9100';
const ALERTMANAGER_CONFIG_URL =
  process.env.ALERTMANAGER_CONFIG_URL || 'http://alertmanager_configurer:9101';

// TG-specific service for generating alerts from events
const TG_ALARM_URL = process.env.TG_ALARM_URL || 'http://alarms:40000';

// service that tracks the default route changes over time
const DEFAULT_ROUTES_HISTORY_HOST =
  process.env.DEFAULT_ROUTES_HISTORY_HOST ||
  'http://default_routes_service:8080';

// allowed delay (in seconds) when generating link health windowing
// from stats data
const STATS_ALLOWED_DELAY_SEC = requiredInt(
  process.env.STATS_ALLOWED_DELAY_SEC,
  60 * 2,
);

const ANP_CLIENT_ID = process.env.ANP_CLIENT_ID;
const ANP_CLIENT_SECRET = process.env.ANP_CLIENT_SECRET;
const ANP_PARTNER_ID = process.env.ANP_PARTNER_ID;
const ANP_API_URL = process.env.ANP_API_URL;
const FACEBOOK_OAUTH_URL = process.env.FACEBOOK_OAUTH_URL;
const ANP_FILE_DIR = process.env.ANP_FILE_DIR || 'data/anp';

module.exports = {
  API_REQUEST_TIMEOUT,
  PROMETHEUS_URL,
  DS_INTERVAL_SEC,
  DEFAULT_API_SERVICE_PORT: '8080',
  DOCKER_API_VERSION,
  LINK_HEALTH_TIME_WINDOW_HOURS,
  LOGIN_ENABLED,
  SSO_ENABLED,
  LOG_LEVEL,
  MYSQL_DB,
  SQLITE_DB,
  MYSQL_HOST,
  MYSQL_PASS,
  MYSQL_PORT,
  MYSQL_USER,
  IS_KUBERNETES,
  SOFTWARE_PORTAL_ENABLED,
  SOFTWARE_PORTAL_URL,
  SOFTWARE_PORTAL_API_TOKEN,
  SOFTWARE_PORTAL_API_ID,
  PROXY_ENABLED,
  SALT_GEN_ROUNDS: 10,
  NETWORKTEST_HOST,
  SCANSERVICE_HOST,
  TOPOLOGY_HISTORY_HOST,
  CLIENT_ROOT_URL,
  KEYCLOAK_HTTP_PROXY,
  KEYCLOAK_HOST,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  DEVELOPMENT,
  KAFKA_HOSTS,
  SESSION_MAX_AGE_MS,
  // alertmanager
  ALERTMANAGER_URL,
  PROMETHEUS_CONFIG_URL,
  ALERTMANAGER_CONFIG_URL,
  TG_ALARM_URL,
  ANP_CLIENT_ID,
  ANP_CLIENT_SECRET,
  ANP_PARTNER_ID,
  ANP_API_URL,
  FACEBOOK_OAUTH_URL,
  ANP_FILE_DIR,
  DEFAULT_ROUTES_HISTORY_HOST,
  STATS_ALLOWED_DELAY_SEC,
  NETWORK_PROVISIONING_FILE,
  // hwprofiles
  HW_PROFILES_BASE_DIR,
};
