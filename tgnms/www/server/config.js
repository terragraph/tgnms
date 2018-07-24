/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const fs = require('fs');
const {join, resolve} = require('path');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASS = process.env.MYSQL_PASS || '';
const MYSQL_DB = process.env.MYSQL_DB || 'cxl';

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

module.exports = {
  LOG_LEVEL,
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASS,
  MYSQL_DB,
  BERINGEI_QUERY_URL,
  NETWORK_CONFIG_DEFAULT,
  NETWORK_CONFIG_INSTANCES_PATH,
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
  SALT_GEN_ROUNDS: 10,
};
