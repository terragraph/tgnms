const fs = require('fs');
const {join, resolve} = require('path');

const BERINGEI_QUERY_URL = process.env.BQS || 'http://localhost:8086';

// network config file
const NETWORK_CONFIG_NETWORKS_PATH =
  resolve(join(__dirname, '../config/networks/'));
const NETWORK_CONFIG_INSTANCES_PATH =
  resolve(join(__dirname, '../config/instances/'));
const NETWORK_CONFIG_DEFAULT = 'lab_networks.json';
const networkConfig = process.env.NETWORK
  ? process.env.NETWORK + '.json'
  : NETWORK_CONFIG_DEFAULT;
const NETWORK_CONFIG_PATH = join(NETWORK_CONFIG_INSTANCES_PATH, networkConfig);
if (!fs.existsSync(NETWORK_CONFIG_PATH)) {
  console.error(
    'Unable to locate network config:',
    NETWORK_CONFIG_PATH,
  );
  process.exit(1);
}

module.exports = {
  BERINGEI_QUERY_URL,
  NETWORK_CONFIG_DEFAULT,
  NETWORK_CONFIG_INSTANCES_PATH,
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
};
