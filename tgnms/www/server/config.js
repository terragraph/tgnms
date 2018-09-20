/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const fs = require('fs');
const {join, resolve} = require('path');

require('dotenv').config();

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
// NOTE: Login is disabled by default until its deployed publicly
const LOGIN_ENABLED = process.env.LOGIN_ENABLED || false;

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = process.env.MYSQL_PORT || '3306';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASS = process.env.MYSQL_PASS || '';
const MYSQL_DB = process.env.MYSQL_DB || 'cxl';

const PROXY_ENABLED = process.env.http_proxy && process.env.http_proxy.length;

const BERINGEI_QUERY_URL = process.env.BQS || 'http://localhost:8086';

// network config file
const NETWORK_CONFIG_NETWORKS_PATH = resolve(
  join(__dirname, '../config/networks/'),
);
const NETWORK_CONFIG_INSTANCES_PATH = resolve(
  join(__dirname, '../config/instances/'),
);
const NETWORK_CONFIG_DEFAULT = 'lab_networks.json';
const networkConfig = process.env.NETWORK
  ? process.env.NETWORK + '.json'
  : NETWORK_CONFIG_DEFAULT;
const NETWORK_CONFIG_PATH = join(NETWORK_CONFIG_INSTANCES_PATH, networkConfig);
if (!fs.existsSync(NETWORK_CONFIG_PATH)) {
  console.error('Unable to locate network config:', NETWORK_CONFIG_PATH);
  process.exit(1);
}

// fix to a stable docker api version (https://docs.docker.com/engine/api/v1.37/)
const DOCKER_API_VERSION = '1.37';

module.exports = {
  LOG_LEVEL,
  LOGIN_ENABLED,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASS,
  MYSQL_DB,
  PROXY_ENABLED,
  BERINGEI_QUERY_URL,
  NETWORK_CONFIG_DEFAULT,
  NETWORK_CONFIG_INSTANCES_PATH,
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
  DOCKER_API_VERSION,
  DEFAULT_API_SERVICE_PORT: '8080',
  SALT_GEN_ROUNDS: 10,
};
