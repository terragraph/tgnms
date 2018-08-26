/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  BERINGEI_QUERY_URL,
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
} = require('../config');
const controllerTTypes = require('../../thrift/gen-nodejs/Controller_types');
const dataJson = require('../metrics/dataJson');
const {getNodesWithUpgradeStatus} = require('./upgrade_status');
const {resetTopologyHAState} = require('../highAvailability/model');

const _ = require('lodash');
const {join} = require('path');
const cp = require('child_process');
const fs = require('fs');
const request = require('request');
const logger = require('../log')(module);

const statusReportExpiry = 2 * 60000; // 2 minutes
const maxThriftRequestFailures = 1;
const maxControllerEvents = 10;

// new topology from worker process
const baseTopologyByName = {};
let configByName = {};
let fileSiteByName = {};
let fileTopologyByName = {};
const ignitionStateByName = {};
const networkHealth = {};
let networkInstanceConfig = {};
let ruckusApsBySite = {};
const statusDumpsByName = {};
const topologyByName = {};
const upgradeStateByName = {};

let fbinternal = false;

function getAllTopologyNames() {
  return Object.keys(configByName);
}

function getConfigByName(topologyName) {
  return configByName[topologyName];
}

function getNetworkHealth(topologyName) {
  return _.get(networkHealth, topologyName);
}

function getTopologyByName(topologyName) {
  if (!fileTopologyByName[topologyName]) {
    return {};
  }
  let topology = {};
  // ensure received topology looks valid-ish before using
  if (topologyByName[topologyName] && topologyByName[topologyName].nodes) {
    topology = topologyByName[topologyName];
  } else {
    topology = fileTopologyByName[topologyName];
  }
  // over-ride the topology name since many don't use
  const config = configByName[topologyName];
  if (!topology.name) {
    logger.error(
      'No topology name received from controller for %s [%s]',
      config.name,
      config.controller_ip_active,
    );
    // force the original name if the controller has no name
    topology.name = fileTopologyByName[topologyName].name;
  }
  // if base config set, show all sites/nodes/links in original topology
  // and hide the rest
  if (config.hasOwnProperty('base_topology_file')) {
    // build list of base sites to include
    const baseTopologyConfig = baseTopologyByName[topologyName];
    const baseSitesByName = new Set();
    baseTopologyConfig.sites.forEach(site => {
      baseSitesByName.add(site.name);
    });
    const nodesToRemove = new Set();
    const onlineSites = new Set();
    topology.nodes.forEach(node => {
      if (node.status !== 1) {
        // node is online, don't remove
        onlineSites.add(node.site_name);
      }
    });
    topology.nodes = topology.nodes.filter(node => {
      if (
        !baseSitesByName.has(node.site_name) &&
        !onlineSites.has(node.site_name)
      ) {
        nodesToRemove.add(node.name);
        return false;
      }
      return true;
    });
    topology.sites = topology.sites.filter(site => {
      if (!baseSitesByName.has(site.name) && !onlineSites.has(site.name)) {
        return false;
      }
      return true;
    });
    topology.links = topology.links.filter(link => {
      if (
        nodesToRemove.has(link.a_node_name) ||
        nodesToRemove.has(link.z_node_name)
      ) {
        return false;
      }
      return true;
    });
  }
  const status = statusDumpsByName[topologyName];
  const nodes = topology.nodes;
  for (let j = 0; j < nodes.length; j++) {
    if (status && status.statusReports) {
      topology.nodes[j].status_dump = status.statusReports[nodes[j].mac_addr];
    }
  }
  // detect aps without a matching site name
  const allRuckusApNames = new Set(Object.keys(ruckusApsBySite));
  if (allRuckusApNames.size > 0) {
    // add ruckus aps
    topology.sites = topology.sites.map(site => {
      const siteName = site.name.toLowerCase();
      // add ruckus ap information to the site
      if (ruckusApsBySite.hasOwnProperty(siteName)) {
        site.ruckus = ruckusApsBySite[siteName];
      }
      allRuckusApNames.delete(siteName);
      return site;
    });
    // log missing site associations
    if (allRuckusApNames.size > 0) {
      logger.debug(
        '[Ruckus AP] Missing site associations for %s',
        allRuckusApNames,
      );
    }
  }
  const networkConfig = Object.assign({}, config);
  networkConfig.topology = topology;
  if (config.site_coords_override) {
    // swap site data
    Object.keys(networkConfig.topology.sites).forEach(key => {
      const site = networkConfig.topology.sites[key];
      if (
        fileSiteByName[topologyName] &&
        fileSiteByName[topologyName][site.name]
      ) {
        site.location = fileSiteByName[topologyName][site.name].location;
      }
    });
  }
  networkConfig.ignition_state = _.get(ignitionStateByName, topologyName, []);
  networkConfig.upgradeStateDump = upgradeStateByName[topologyName]
    ? getNodesWithUpgradeStatus(
        topology.nodes,
        upgradeStateByName[topologyName],
      )
    : null;
  networkConfig.fbinternal = fbinternal;
  return networkConfig;
}

function getNetworkInstanceConfig() {
  return networkInstanceConfig;
}

function reloadInstanceConfig() {
  logger.debug('Reloading instance config');
  configByName = {};
  fileTopologyByName = {};
  fileSiteByName = {};

  // Read list of networks and start timer to pull network status/topology
  const data = fs.readFileSync(NETWORK_CONFIG_PATH, 'utf-8');
  // serialize some example
  networkInstanceConfig = JSON.parse(data);
  if ('topologies' in networkInstanceConfig) {
    const topologies = networkInstanceConfig.topologies;
    Object.keys(topologies).forEach(name => {
      const topologyConfig = topologies[name];
      const topology = JSON.parse(
        fs.readFileSync(
          join(NETWORK_CONFIG_NETWORKS_PATH, topologyConfig.topology_file),
        ),
      );

      // base config
      if (topologyConfig.hasOwnProperty('base_topology_file')) {
        baseTopologyByName[topology.name] = JSON.parse(
          fs.readFileSync(
            join(
              NETWORK_CONFIG_NETWORKS_PATH,
              topologyConfig.base_topology_file,
            ),
          ),
        );
      }

      // original sites take priority, only add missing nodes and sites
      const sitesByName = {};
      topology.sites.forEach(site => {
        sitesByName[site.name] = site;
      });

      const config = topologyConfig;
      config.controller_online = false;
      config.controller_failures = 0;
      config.query_service_online = false;
      config.name = topology.name;
      config.controller_events = [];
      // By default, set the active controller to the primary
      config.controller_ip_active = config.controller_ip;
      configByName[topology.name] = config;

      fileTopologyByName[topology.name] = topology;

      fileSiteByName[topology.name] = {};
      topology.sites.forEach(site => {
        fileSiteByName[topology.name][site.name] = site;
      });

      // Initialize BStar State
      resetTopologyHAState(topology.name);
    });
  } else {
    logger.error('No topologies found in config, failing!');
    process.exit(1);
  }

  fbinternal = _.get(networkInstanceConfig, 'fbinternal', false);
}

function refreshRuckusControllerCache() {
  logger.debug('Request to update ruckus controller cache');
  const ruckusUrl = BERINGEI_QUERY_URL + '/ruckus_ap_stats';
  request.post(
    {
      url: ruckusUrl,
      body: JSON.stringify({}),
    },
    (err, httpResponse, body) => {
      if (err) {
        logger.error('Error fetching from query service: %s', err);
        return;
      }

      try {
        const ruckusCache = JSON.parse(body);
        ruckusApsBySite = ruckusCache;
      } catch (ex) {
        logger.error('Unable to parse ruckus stats');
        return;
      }
      logger.debug('Fetched ruckus controller stats.');
    },
  );
}

function refreshNetworkHealth(topologyName) {
  if (!configByName.hasOwnProperty(topologyName)) {
    logger.error('network_health: Unknown topology %s', topologyName);
    return;
  }
  const nodeMetrics = [
    {
      name: 'minion_uptime',
      metric: 'e2e_minion.uptime',
      type: 'uptime_sec',
      min_ago: 24 * 60 /* 24 hours */,
    },
  ];
  const linkMetrics = [
    {
      name: 'alive',
      metric: 'fw_uptime',
      type: 'event',
      min_ago: 24 * 60 /* 24 hours */,
    },
  ];
  const startTime = new Date();
  const query = {
    topologyName,
    nodeQueries: nodeMetrics,
    linkQueries: linkMetrics,
  };
  const chartUrl = BERINGEI_QUERY_URL + '/table_query';
  request.post(
    {
      url: chartUrl,
      body: JSON.stringify(query),
    },
    (err, httpResponse, body) => {
      if (err) {
        logger.error('Error fetching from beringei: %s', err);
        configByName[topologyName].query_service_online = false;
        return;
      }
      // set BQS online
      configByName[topologyName].query_service_online = true;
      const totalTime = new Date() - startTime;
      logger.debug('Fetched health for %s in %s ms', topologyName, totalTime);
      let parsed;
      try {
        parsed = JSON.parse(httpResponse.body);
      } catch (ex) {
        logger.error('Failed to parse health json: %s', httpResponse.body);
        return;
      }
      // join the results
      networkHealth[topologyName] = parsed;
    },
  );
}

const worker = cp.fork(join(__dirname, 'worker.js'));

function scheduleTopologyUpdate() {
  logger.debug('scheduling topology update');
  worker.send({
    type: 'poll',
    topologies: Object.keys(configByName).map(keyName => configByName[keyName]),
  });
}

function scheduleScansUpdate() {
  logger.debug('scheduling scans update');
  worker.send({
    type: 'scan_poll',
    topologies: Object.keys(configByName).map(keyName => configByName[keyName]),
  });
}

worker.on('message', msg => {
  logger.debug(
    'received message from worker: %s, (%s), success: %s',
    msg.type,
    msg.name,
    msg.success,
  );
  if (!(msg.name in configByName)) {
    logger.error('Unable to find topology %s', msg.name);
    return;
  }
  const config = configByName[msg.name];
  let currentTime;
  switch (msg.type) {
    case 'topology_update':
      // log online/offline changes
      if (config.controller_online !== msg.success) {
        logger.debug(
          '%s controller %s in %s ms',
          msg.name,
          msg.success ? 'online' : 'offline',
          msg.response_time,
        );
        // add event for controller up/down
        config.controller_events.push([new Date(), msg.success]);
        if (config.controller_events.length > maxControllerEvents) {
          // restrict events size
          config.controller_events.splice(maxControllerEvents);
        }
      }
      // validate the name on disk matches the e2e received topology
      if (msg.success && msg.name !== msg.topology.name) {
        logger.error(
          'Invalid name received from controller for: %s, Received %s',
          msg.name,
          msg.topology.name,
        );
        config.controller_online = false;
        config.controller_error =
          'Name mis-match between topology on disk ' +
          'and e2e controller topology. ' +
          msg.name +
          ' != ' +
          msg.topology.name;
        return;
      } else if (msg.success) {
        // clear errors that no-longer exist
        delete config.controller_error;
      }
      config.controller_failures = msg.success
        ? 0
        : config.controller_failures + 1;

      if (config.controller_failures < maxThriftRequestFailures) {
        config.controller_online = true;
      } else {
        config.controller_online = false;
      }
      topologyByName[msg.name] = msg.success ? msg.topology : {};
      break;
    case 'status_dump_update':
      statusDumpsByName[msg.name] = msg.success ? msg.status_dump : {};
      currentTime = new Date().getTime();
      // remove nodes with old timestamps in status report
      if (msg.success && msg.status_dump && msg.status_dump.statusReports) {
        if (msg.status_dump.version) {
          config.controller_version = msg.status_dump.version.slice(0, -2);
        }
        Object.keys(msg.status_dump.statusReports).forEach(nodeMac => {
          const report = msg.status_dump.statusReports[nodeMac];
          const ts = report.timeStamp * 1000;
          if (ts !== 0) {
            const timeDiffMs = currentTime - ts;
            if (timeDiffMs > statusReportExpiry) {
              // status older than 2 minuets
              delete msg.status_dump.statusReports[nodeMac];
            }
          }
        });
      }
      break;
    case 'scan_status':
      if (msg.success) {
        dataJson.writeScanResults(msg.name, msg.scan_status);
      } else {
        logger.error('Failed to get scan_status from %s', msg.name);
      }
      break;
    case 'ignition_state':
      if (msg.success && msg.ignition_state) {
        const linkNames = Array.from(
          new Set(
            msg.ignition_state.igCandidates.map(
              candidate => candidate.linkName,
            ),
          ),
        );
        ignitionStateByName[msg.name] = linkNames;
      } else {
        ignitionStateByName[msg.name] = [];
      }
      break;
    case 'upgrade_state':
      upgradeStateByName[msg.name] =
        msg.success && msg.upgradeState ? msg.upgradeState : null;
      break;
    case 'bstar_state':
      break;
    default:
      logger.error('Unknown message type %s', msg.type);
  }
});

module.exports = {
  getAllTopologyNames,
  getConfigByName,
  getNetworkHealth,
  getNetworkInstanceConfig,
  getTopologyByName,
  refreshNetworkHealth,
  refreshRuckusControllerCache,
  reloadInstanceConfig,
  scheduleScansUpdate,
  scheduleTopologyUpdate,
};
