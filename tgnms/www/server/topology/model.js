
const {
  BERINGEI_QUERY_URL,
  NETWORK_CONFIG_INSTANCES_PATH,
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
} = require('../config');
const dataJson = require('../../dataJson');
const {getNodesWithUpgradeStatus} = require('./upgrade_status');
const _ = require('lodash');
const {join} = require('path');
const cp = require('child_process');
const fs = require('fs');
const request = require('request');

const statusReportExpiry = 2 * 60000; // 2 minutes
const maxThriftRequestFailures = 1;
const maxThriftReportAge = 30; // seconds
const maxControllerEvents = 10;

// new topology from worker process
var baseTopologyByName = {};
var configByName = {};
var fileSiteByName = {};
var fileTopologyByName = {};
var ignitionStateByName = {};
var networkHealth = {};
var networkInstanceConfig = {};
var ruckusApsBySite = {};
var statusDumpsByName = {};
var topologyByName = {};
var upgradeStateByName = {};

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
    console.error(
      'No topology name received from controller for',
      config.name,
      '[',
      config.controller_ip_active,
      ']'
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
  for (var j = 0; j < nodes.length; j++) {
    if (status && status.statusReports) {
      topology.nodes[j].status_dump =
        status.statusReports[nodes[j].mac_addr];
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
      console.log('[Ruckus AP] Missing site associations for', allRuckusApNames);
    }
  }
  const networkConfig = Object.assign({}, config);
  networkConfig.topology = topology;
  if (config.site_coords_override) {
    // swap site data
    Object.keys(networkConfig.topology.sites).forEach(function (key) {
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
  networkConfig.upgradeStateDump = _.has(upgradeStateByName, 'topologyName')
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
  console.log("Reloading instance config");
  configByName = {};
  fileTopologyByName = {};
  fileSiteByName = {};

  // Read list of networks and start timer to pull network status/topology
  const data = fs.readFileSync(NETWORK_CONFIG_PATH, 'utf-8');
  // serialize some example
  networkInstanceConfig = JSON.parse(data);
  if ('topologies' in networkInstanceConfig) {
    const topologies = networkInstanceConfig.topologies;
    Object.keys(topologies).forEach(function (key) {
      const topologyConfig = topologies[key];
      const topology = JSON.parse(
        fs.readFileSync(
          join(NETWORK_CONFIG_NETWORKS_PATH, topologyConfig.topology_file),
        )
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
      config.controller_ip_active = config.controller_ip;
      config.controller_ip_passive = config.controller_ip_backup ? config.controller_ip_backup : null;
      configByName[topology.name] = config;
      fileTopologyByName[topology.name] = topology;
      const topologyName = topology.name;
      fileSiteByName[topologyName] = {};
      topology.sites.forEach(site => {
        fileSiteByName[topologyName][site.name] = site;
      });
    });
  } else {
    console.error('No topologies found in config, failing!');
    process.exit(1);
  }

  fbinternal = _.get(networkInstanceConfig, 'fbinternal', false);
}

function refreshRuckusControllerCache() {
  console.log('Request to update ruckus controller cache');
  const ruckusUrl = BERINGEI_QUERY_URL + '/ruckus_ap_stats';
  request.post(
    {
      url: ruckusUrl,
      body: JSON.stringify({}),
    },
    (err, httpResponse, body) => {
      if (err) {
        console.error('Error fetching from query service:', err);
        return;
      }

      try {
        const ruckusCache = JSON.parse(body);
        ruckusApsBySite = ruckusCache;
      } catch (ex) {
        console.error('Unable to parse ruckus stats');
        return;
      }
      console.log('Fetched ruckus controller stats.');
    }
  );
}

function refreshNetworkHealth(topologyName) {
  if (!configByName.hasOwnProperty(topologyName)) {
    console.error('network_health: Unknown topology', topologyName);
    return;
  }
  const nodeMetrics = [
    {
      name: 'minion_uptime',
      metric: 'e2e_minion.uptime',
      type: 'uptime_sec',
      min_ago: 24 * 60, /* 24 hours */
    },
  ];
  const linkMetrics = [
    {
      name: 'alive',
      metric: 'fw_uptime',
      type: 'event',
      min_ago: 24 * 60, /* 24 hours */
    },
  ];
  const startTime = new Date();
  const query = {
    topologyName: topologyName,
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
        console.error('Error fetching from beringei:', err);
        configByName[topologyName].query_service_online = false;
        return;
      }
      // set BQS online
      configByName[topologyName].query_service_online = true;
      const totalTime = new Date() - startTime;
      console.log('Fetched health for', topologyName, 'in', totalTime, 'ms');
      let parsed;
      try {
        parsed = JSON.parse(httpResponse.body);
        // the backend returns both A/Z sides, re-write to one
        if (parsed &&
            parsed.length === 2 &&
            parsed[1].hasOwnProperty('metrics')) {
          Object.keys(parsed[1].metrics).forEach(linkName => {
            const linkNameOnly = linkName.replace(" (A) - fw_uptime", "");
            if (linkName !== linkNameOnly) {
              parsed[1].metrics[linkNameOnly] = parsed[1].metrics[linkName];
              // delete a-side name
              delete parsed[1].metrics[linkName];
            } else {
              // delete z-side name
              delete parsed[1].metrics[linkName];
            }
          });
        }
      } catch (ex) {
        console.error('Failed to parse health json:', httpResponse.body);
        return;
      }
      // join the results
      networkHealth[topologyName] = parsed;
    }
  );
}

function refreshSelfTestData (topologyName) {
  // !!!!self test does not have network name - need to add it !!!!
  if (!configByName.hasOwnProperty(topologyName)) {
    console.error('self_test: Unknown topology', topologyName);
    return;
  }
  const filter = {
    filterType: 'GROUPS',
  };
  dataJson.readSelfTestResults(topologyName, null, filter);
}

function refreshStatsTypeaheadCache(topologyName) {
  console.log('Request to update stats type-ahead cache for topology', topologyName);
  let topology = getTopologyByName(topologyName);
  if (!topology) {
    console.error('No topology found for', topologyName);
    return;
  }
  topology = topology.topology;
  topology.nodes.map(node => {
    delete node.status_dump;
    delete node.golay_idx;
  });
  topology.links.map(link => {
    delete link.linkup_attempts;
  });
  const chartUrl = BERINGEI_QUERY_URL + '/stats_typeahead_cache';
  request.post(
    {
      url: chartUrl,
      body: JSON.stringify(topology),
    },
    (err, httpResponse, body) => {
      if (err) {
        console.error('Error fetching from query service:', err);
        return;
      }
      console.log('Fetched stats_ta_cache for', topologyName);
    }
  );
}

const worker = cp.fork(join(__dirname, 'worker.js'));

function scheduleTopologyUpdate() {
  worker.send({
    type: 'poll',
    topologies: Object.keys(configByName).map(
      keyName => configByName[keyName]
    ),
  });
}

function scheduleStatsUpdate() {
  worker.send({
    type: 'scan_poll',
    topologies: Object.keys(configByName).map(
      keyName => configByName[keyName]
    ),
  });
}

worker.on('message', msg => {
  if (!(msg.name in configByName)) {
    console.error('Unable to find topology', msg.name);
    return;
  }
  const config = configByName[msg.name];
  var currentTime;
  var curOnline;
  switch (msg.type) {
    case 'topology_update':
      // log online/offline changes
      if (config.controller_online !== msg.success) {
        console.log(
          new Date().toString(),
          msg.name,
          'controller',
          msg.success ? 'online' : 'offline',
          'in',
          msg.response_time,
          'ms'
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
        console.error(
          'Invalid name received from controller for:',
          msg.name,
          ', Received:',
          msg.topology.name
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
      if (config.controller_failures >= maxThriftRequestFailures) {
        config.controller_online = false;
      } else {
        config.controller_online = true;
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
        console.error('Failed to get scan_status from', msg.name);
      }
      break;
    case 'ignition_state':
      if (msg.success && msg.ignition_state) {
        const linkNames = Array.from(
          new Set(
            msg.ignition_state.igCandidates.map(candidate => candidate.linkName)
          )
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
      // check if topology has a backup controller and BSTAR_GET_STATE was
      // successful
      if (config.controller_ip_backup && msg.success) {
        // check if state changed.
        if ((msg.controller_ip == config.controller_ip_active &&
             (msg.bstar_fsm.state == controllerTTypes.BinaryStarFsmState.STATE_PASSIVE ||
              msg.bstar_fsm.state == controllerTTypes.BinaryStarFsmState.STATE_BACKUP)) ||
            (msg.controller_ip == config.controller_ip_passive &&
             (msg.bstar_fsm.state == controllerTTypes.BinaryStarFsmStateSTATE_ACTIVE ||
              msg.bstar_fsm.state == controllerTTypes.BinaryStarFsmStateSTATE_PRIMARY))) {
          const tempIp = config.controller_ip_passive;
          config.controller_ip_passive = config.controller_ip_active;
          config.controller_ip_active = tempIp;
          console.log(config.name + " BSTAR state changed");
          console.log("Active controller is  : " + config.controller_ip_active);
          console.log("Passive controller is : " + config.controller_ip_passive);
        }
      }
      break;
    default:
      console.error('Unknown message type', msg.type);
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
  refreshSelfTestData,
  refreshStatsTypeaheadCache,
  reloadInstanceConfig,
  scheduleStatsUpdate,
  scheduleTopologyUpdate,
};
