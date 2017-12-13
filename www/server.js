/* eslint no-console: 0 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const request = require('request');

// set up the upgrade images path
const NETWORK_UPGRADE_IMAGES_REL_PATH = '/static/tg-binaries';
const NETWORK_UPGRADE_IMAGES_FULL_PATH =
  process.cwd() + NETWORK_UPGRADE_IMAGES_REL_PATH;
if (!fs.existsSync(NETWORK_UPGRADE_IMAGES_FULL_PATH)) {
  fs.mkdirSync(NETWORK_UPGRADE_IMAGES_FULL_PATH);
}

// multer + configuration
const multer  = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, NETWORK_UPGRADE_IMAGES_FULL_PATH);
  },
  // where to save the file on disk
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// set up font awesome here

const pug = require('pug');
const compression = require('compression');
// worker process
const cp = require('child_process');
const worker = cp.fork('./worker.js');
const syncWorker = require('./worker.js');
// packaging
const webpack = require('webpack');
const devMode = process.env.NODE_ENV !== 'production';
const port = devMode && process.env.PORT ? process.env.PORT : 80;
// thrift types from controller
const Topology_ttypes = require('./thrift/gen-nodejs/Topology_types');
const Controller_ttypes = require('./thrift/gen-nodejs/Controller_types');
// thrift types from aggregator
const Aggregator_ttypes = require('./thrift/gen-nodejs/Aggregator_types');
// network config file
const NETWORK_CONFIG_NETWORKS_PATH = './config/networks/';
const NETWORK_CONFIG_INSTANCES_PATH = './config/instances/';
const NETWORK_CONFIG_DEFAULT = 'lab_networks.json';
const networkConfig = process.env.NETWORK ? process.env.NETWORK + '.json'
                                          : NETWORK_CONFIG_DEFAULT;
if (!fs.existsSync(NETWORK_CONFIG_INSTANCES_PATH + networkConfig)) {
  console.error('Unable to locate network config:',
                networkConfig,
                'in:',
                NETWORK_CONFIG_INSTANCES_PATH);
  process.exit(1)
}
const app = express();
app.use(compression());
const queryHelper = require('./queryHelper');
queryHelper.refreshKeyNames();
setInterval(queryHelper.refreshKeyNames, 30000);

// new json writer
const dataJson = require('./dataJson');
// load the initial node ids
dataJson.refreshNodes();

const aggregatorProxy = require('./aggregatorProxy');
const ipaddr = require('ipaddr.js');
const expressWs = require('express-ws')(app);
const os = require('os');
const pty = require('pty.js');

const statusReportExpiry = 2 * 60000; // 2 minutes
const maxThriftRequestFailures = 1;
const maxThriftReportAge = 30; // seconds
const maxControllerEvents = 10;

const IM_SCAN_POLLING_ENABLED = process.env.IM_SCAN_POLLING_ENABLED ?
                                process.env.IM_SCAN_POLLING_ENABLED == '1' : 0;

var refreshIntervalTimer = undefined;
var networkHealthTimer = undefined;
var eventLogsTables = {};
var systemLogsSources = {};
var networkInstanceConfig = {};
// new topology from worker process
var configByName = {};
var fileTopologyByName = {};
var baseTopologyByName = {};
var fileSiteByName = {};
var topologyByName = {};
var statusDumpsByName = {};
var ignitionStateByName = {};
var aggrStatusDumpsByName = {};
var adjacencyMapsByName = {};
var upgradeStateByName = {};
var networkHealth = {};

var dashboards = {};
fs.readFile('./config/dashboards.json', 'utf-8', (err, data) => {
  if (!err) {
    dashboards = JSON.parse(data);
  }
});

worker.on('message', (msg) => {
  if (!(msg.name in configByName)) {
    console.error('Unable to find topology', msg.name);
    return;
  }
  const config = configByName[msg.name];
  switch (msg.type) {
    case 'topology_update':
      // log online/offline changes
      if (config.controller_online != msg.success) {
        console.log(new Date().toString(), msg.name, 'controller',
                    (msg.success ? 'online' : 'offline'),
                    'in', msg.response_time, 'ms');
        // add event for controller up/down
        config.controller_events.push([new Date(), msg.success]);
        if (config.controller_events.length > maxControllerEvents) {
          // restrict events size
          config.controller_events.splice(maxControllerEvents);
        }
      }
      // validate the name on disk matches the e2e received topology
      if (msg.success && msg.name != msg.topology.name) {
        console.error('Invalid name received from controller for:', msg.name,
                      ', Received:', msg.topology.name);
        config.controller_online = false;
        config.controller_error = 'Name mis-match between topology on disk ' +
                                  'and e2e controller topology. ' + msg.name +
                                  ' != ' + msg.topology.name;
        return;
      } else if (msg.success) {
        // clear errors that no-longer exist
        delete config['controller_error'];
      }
      config.controller_failures = msg.success ? 0 : config.controller_failures + 1;
      if (config.controller_failures >= maxThriftRequestFailures) {
        config.controller_online = false;
      } else {
        config.controller_online = true;
      }
      topologyByName[msg.name] = msg.success ? msg.topology : {};
      break;
    case 'status_dump_update':
      statusDumpsByName[msg.name] = msg.success ? msg.status_dump : {}
      var currentTime = new Date().getTime();
      // remove nodes with old timestamps in status report
      if (msg.success && msg.status_dump && msg.status_dump.statusReports) {
        if (msg.status_dump.version) {
          config.controller_version = msg.status_dump.version.slice(0, -2);
        }
        Object.keys(msg.status_dump.statusReports).forEach((nodeMac) => {
          const report = msg.status_dump.statusReports[nodeMac];
          const ts = parseInt(Buffer.from(report.timeStamp.buffer.data).readUIntBE(0, 8)) * 1000;
          if (ts != 0) {
            const timeDiffMs = currentTime - ts;
            if (timeDiffMs > statusReportExpiry) {
              // status older than 2 minuets
              delete msg.status_dump.statusReports[nodeMac];
            }
          }
        });
      }
      break;
    case 'aggr_status_report_update':
      // log the last success time so this can be shared on old/new types
      if (msg.success) {
        config.aggregator_last_success = new Date().getTime();
        aggrStatusDumpsByName[msg.name] = msg.status_report;
      }
      var curOnline = (new Date().getTime() <
                       (config.aggregator_last_success + maxThriftReportAge * 1000));
      config.aggregator_online = curOnline;
      // log online/offline changes
      if (config.aggregator_online != curOnline) {
        console.log(new Date().toString(), msg.name, 'aggregator',
                    (msg.success ? 'online' : 'offline'),
                    'in', msg.response_time, 'ms');
      }
      var currentTime = new Date().getTime();
      // remove nodes with old timestamps in status report
      if (msg.success && msg.status_report && msg.status_report.statusReports) {
        Object.keys(msg.status_report.statusReports).forEach((nodeMac) => {
          const report = msg.status_report.statusReports[nodeMac];
          const ts = parseInt(Buffer.from(report.timeStamp.buffer.data).readUIntBE(0, 8)) * 1000;
          if (ts != 0) {
            const timeDiffMs = currentTime - ts;
            if (timeDiffMs > statusReportExpiry) {
              // status older than 2 minuets
              delete msg.status_report.statusReports[nodeMac];
            }
          }
        });
      }
      break;
    case 'aggr_status_dump_update':
      // log the last success time so this can be shared on old/new types
      if (msg.success) {
        config.aggregator_last_success = new Date().getTime();
      }
      var curOnline = (new Date().getTime() <
                       (config.aggregator_last_success + maxThriftReportAge * 1000));
      config.aggregator_online = curOnline;
      // log online/offline changes
      if (config.aggregator_online != curOnline) {
        console.log(new Date().toString(), msg.name, 'aggregator',
                    (msg.success ? 'online' : 'offline'),
                    'in', msg.response_time, 'ms');
      }
      aggrStatusDumpsByName[msg.name] = msg.success ? msg.status_dump : {};
      var currentTime = new Date().getTime();
      // remove nodes with old timestamps in status report
      if (msg.success && msg.status_dump && msg.status_dump.statusReports) {
        if (msg.status_dump.version) {
          config.aggregator_version = msg.status_dump.version.slice(0, -2);
        }
        Object.keys(msg.status_dump.statusReports).forEach((nodeMac) => {
          const report = msg.status_dump.statusReports[nodeMac];
          const ts = parseInt(Buffer.from(report.timeStamp.buffer.data).readUIntBE(0, 8)) * 1000;
          if (ts != 0) {
            const timeDiffMs = currentTime - ts;
            if (timeDiffMs > statusReportExpiry) {
              // status older than 2 minuets
              delete msg.status_dump.statusReports[nodeMac];
            }
          }
        });
      }
      // adjacencies
      if (msg.success && msg.status_dump && msg.status_dump.adjacencyMap) {
        if (!adjacencyMapsByName[msg.name]) {
          adjacencyMapsByName[msg.name] = {};
        }
        let adjMap = msg.status_dump.adjacencyMap;
        Object.keys(adjMap).forEach(name => {
          let vec = adjMap[name].adjacencies;
          let node_mac = name.slice(5).replace(/\./g, ':').toUpperCase();
          if (!adjacencyMapsByName[msg.name][node_mac]) {
            adjacencyMapsByName[msg.name][node_mac] = {};
          }
          for (let j = 0; j < vec.length; j++) {
            let llAddr = ipaddr.fromByteArray(Buffer.from(vec[j].nextHopV6.addr, 'ASCII')).toString();
            let nextMac = vec[j].otherNodeName.slice(5).replace(/\./g, ':').toUpperCase();
              adjacencyMapsByName[msg.name][node_mac][llAddr] = nextMac;
          }
        });
      }
      break;
    case 'scan_status':
      if (!msg.success) {
        console.error('Failed to get scan_status from', msg.name);
        break;
      }
      dataJson.writeScanResults(msg.name, msg.scan_status);
    case 'ignition_state':
      if (msg.success && msg.ignition_state) {
        let linkNames = Array.from(new Set(msg.ignition_state.igCandidates.map(candidate => candidate.linkName)));
        ignitionStateByName[msg.name] = linkNames;
      } else {
        ignitionStateByName[msg.name] = [];
      }
      break;
    case 'upgrade_state':
      upgradeStateByName[msg.name] = (msg.success && msg.upgradeState) ?
        msg.upgradeState : null;

      break;
    default:
      console.error('Unknown message type', msg.type);
  }
});

var terminals = {},
    logs = {};

var tgNodeIp = null;

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
  let config = configByName[topologyName];
  if (!topology.name) {
    console.error('No topology name received from controller for',
                  config.name, '[', config.controller_ip, ']');
    // force the original name if the controller has no name
    topology.name = fileTopologyByName[topologyName].name;
  }
  // if base config set, show all sites/nodes/links in original topology
  // and hide the rest
  if (config.hasOwnProperty('base_topology_file')) {
    // build list of base sites to include
    let baseTopologyConfig = baseTopologyByName[topologyName];
    let baseSitesByName = new Set();
    baseTopologyConfig.sites.forEach(site => {
      baseSitesByName.add(site.name);
    });
    let nodesToRemove = new Set();
    let onlineSites = new Set();
    topology.nodes.forEach(node => {
      if (node.status != 1) {
        // node is online, don't remove
        onlineSites.add(node.site_name);
      }
    });
    topology.nodes = topology.nodes.filter(node => {
      if (!baseSitesByName.has(node.site_name) && !onlineSites.has(node.site_name)) {
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
      if (nodesToRemove.has(link.a_node_name) || nodesToRemove.has(link.z_node_name)) {
        return false;
      }
      return true;
    });
  }
  let status = statusDumpsByName[topologyName];
  let nodes = topology.nodes;
  for (var j = 0; j < nodes.length; j++) {
    if (status && status.statusReports) {
      topology.nodes[j]["status_dump"] =
        status.statusReports[nodes[j].mac_addr];
    }
  }
  let networkConfig = Object.assign({}, config);
  networkConfig.topology = topology;
  if (config.site_coords_override) {
    // swap site data
    Object.keys(networkConfig.topology.sites).forEach(function(key) {
      let site = networkConfig.topology.sites[key];
      if (fileSiteByName[topologyName] && fileSiteByName[topologyName][site.name]) {
        site.location = fileSiteByName[topologyName][site.name].location;
      }
    });
  }
  let ignitionState = [];
  if (ignitionStateByName.hasOwnProperty(topologyName)) {
    ignitionState = ignitionStateByName[topologyName];
  }
  networkConfig.ignition_state = ignitionState;

  let upgradeStateDump = null;
  if (upgradeStateByName.hasOwnProperty(topologyName) && !!upgradeStateByName[topologyName]) {
    let upgradeState = upgradeStateByName[topologyName];
    upgradeStateDump = getNodesWithUpgradeStatus(topology.nodes, upgradeState);
  }

  networkConfig.upgradeStateDump = upgradeStateDump;

  return networkConfig;
}

// TODO: Kelvin: not needed for now
function sortNodesByPendingReqs(nodes, pendingReqs) {
  let nodeNameToNode = {};
  nodes.forEach((node) => {
    nodeNameToNode[node.name] = node;
  })

  let pendingReqNodes = [];

  pendingReqs.forEach((req) => {
    if (req.ugType === 10) {
      // NODES level request
      req.nodes.filter(nodeName => !!nodeNameToNode[nodeName]).forEach((nodeName) => {
        pendingReqNodes.push(Object.assign({}, nodeNameToNode[nodeName], {
          pendingReqId: req.urReq.upgradeReqId,
          urType: req.urReq.urType
        }));
      });
    } else if (req.ugType === 20) {
      // NETWORK level request, First, convert the list of excluded nodes into a set
      var excludedNodes = new Set(req.excludeNodes);
      nodes.filter(node => !excludedNodes.has(node)).forEach((node) => {
        pendingReqNodes.push(Object.assign({}, node, {
          pendingReqId: req.urReq.upgradeReqId,
          urType: req.urReq.urType
        }));
      });
    }
  });

  return pendingReqNodes;
}

function getNodesWithUpgradeStatus(nodes, upgradeState) {
  let upgradeStatusDump = {
    curUpgradeReq: upgradeState.curReq,

    curBatch: [],
    pendingBatches: [],
    pendingReqs: upgradeState.pendingReqs,
    // pendingReqNodes: [], // a node might appear in multiple pending requests
  };

  // node mac_addr --> node object
  let nodeNameToNode = {};
  nodes.forEach((node) => {
    nodeNameToNode[node.name] = node;
  })

  // populate current batch
  let curBatchNodes = [];
  upgradeState.curBatch.filter(name => !!nodeNameToNode[name]).forEach((name) => {
    curBatchNodes.push(nodeNameToNode[name]);
  });
  upgradeStatusDump.curBatch = curBatchNodes;

  // populate pending batches
  let pendingBatchNodes = [];
  upgradeState.pendingBatches.forEach((batch, batchIdx) => {
    let nodesInBatch = [];
    batch.filter(name => !!nodeNameToNode[name]).forEach((name) => {
      nodesInBatch.push(nodeNameToNode[name]);
    });
    pendingBatchNodes.push(nodesInBatch);
  });
  upgradeStatusDump.pendingBatches = pendingBatchNodes;

  // populate pending requests (disabled expanded view of nodes for now!)

  // upgradeStatusDump.pendingReqNodes = sortNodesByPendingReqs(nodes, upgradeState.pendingReqs);
  return upgradeStatusDump;
}

function reloadInstanceConfig() {
  if (refreshIntervalTimer) {
    clearInterval(refreshIntervalTimer);
    clearInterval(networkHealthTimer);
  }
  configByName = {};
  fileTopologyByName = {};
  fileSiteByName = {};

  // Read list of networks and start timer to pull network status/topology
  fs.readFile(NETWORK_CONFIG_INSTANCES_PATH + networkConfig, 'utf-8', (err, data) => {
    // unable to open file, exit
    if (err) {
      console.error('Unable to read config, failing.');
      process.exit(1)
    }
    // serialize some example
    networkInstanceConfig = JSON.parse(data);
    if ('topologies' in networkInstanceConfig) {
      let topologies = networkInstanceConfig['topologies'];
      Object.keys(topologies).forEach(function(key) {
        let topologyConfig = topologies[key];
        let topology = JSON.parse(fs.readFileSync(
          NETWORK_CONFIG_NETWORKS_PATH + topologyConfig.topology_file));
        // base config
        if (topologyConfig.hasOwnProperty('base_topology_file')) {
          baseTopologyByName[topology['name']] = JSON.parse(fs.readFileSync(
            NETWORK_CONFIG_NETWORKS_PATH + topologyConfig.base_topology_file));
        }
        // original sites take priority, only add missing nodes and sites
        let sitesByName = {};
        let nodesBySite = {};
        topology.sites.forEach(site => {
          sitesByName[site.name] = site;
        });
        let config = topologyConfig;
        config['controller_online'] = false;
        config['controller_failures'] = 0;
        config['aggregator_online'] = false;
        config['aggregator_failures'] = 0;
        config['name'] = topology['name'];
        config['controller_events'] = [];
        configByName[topology['name']] = config;
        fileTopologyByName[topology['name']] = topology;
        let topologyName = topology['name'];
        fileSiteByName[topologyName] = {};
        topology.sites.forEach((site) => {
          fileSiteByName[topologyName][site.name] = site;
        });
      });
    } else {
      console.error('No topologies found in config, failing!');
      process.exit(1)
    }

    let refresh_interval = 5000;
    let health_interval = 30000;
    if ('refresh_interval' in networkInstanceConfig) {
      refresh_interval = networkInstanceConfig['refresh_interval'];
    }
    networkHealthTimer = setInterval(() => {
      Object.keys(configByName).forEach(configName => {
        console.log('Refreshing network health for', configName);
        refreshNetworkHealth(configName);
      });
    }, health_interval);
    // start poll request interval
    refreshIntervalTimer = setInterval(() =>
      {
        worker.send({
          type: 'poll',
          topologies: Object.keys(configByName).map(keyName => configByName[keyName]),
        });
      }, refresh_interval);

    if (IM_SCAN_POLLING_ENABLED) {
      let scan_poll_interval = 60000;
      if ('scan_poll_interval' in networkInstanceConfig) {
        scan_poll_interval = networkInstanceConfig['scan_poll_interval'];
      }
      // start scan poll request interval
      scanPollIntervalTimer = setInterval(() =>
          {
            worker.send({
              type: 'scan_poll',
              topologies: Object.keys(configByName).map(keyName => configByName[keyName]),
            });
          }, scan_poll_interval);
    }
  });
}
// initial config load
reloadInstanceConfig();
app.post(/\/config\/save$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    if (!httpPostData.length) {
      return;
    }
    let configData = JSON.parse(httpPostData);
    if (configData && configData.topologies) {
      configData.topologies.forEach(config => {
        // if the topology file doesn't exist, write it
        // TODO - sanitize file name (serious)
        let topologyFile = NETWORK_CONFIG_NETWORKS_PATH + config.topology_file;
        if (config.topology && !fs.existsSync(topologyFile)) {
          console.log('Missing topology file for', config.topology.name,
                      'writing to', topologyFile);
          fs.writeFile(topologyFile, JSON.stringify(config.topology, null, 4), function(err) {
            console.error('Unable to write topology file', topologyFile,
                          'error:', err);
          });
        }
        // ensure we don't write the e2e topology to the instance config
        delete config['topology'];
      });
    }

    // update mysql time series db
    let liveConfigFile = NETWORK_CONFIG_INSTANCES_PATH + networkConfig;
    fs.writeFile(liveConfigFile, JSON.stringify(configData, null, 4), function(err) {
      if (err) {
        res.status(500).end("Unable to save");
        console.log('Unable to save', err);
        return;
      }
      res.status(200).end("Saved");
      console.log('Saved instance config', networkConfig);
      // reload it all
      reloadInstanceConfig();
    });
  });
});
// Read list of event logging Tables
fs.readFile('./config/event_logging_tables.json', 'utf-8', (err, data) => {
  // unable to open file, exit
  if (err) {
    res.status(500).send(err.stack);
    return;
  }
  eventLogsTables = JSON.parse(data);
});

// Read list of system logging sources
fs.readFile('./config/system_logging_sources.json', 'utf-8', (err, data) => {
  // unable to open file, exit
  if (err) {
    res.status(500).send(err.stack);
    return;
  }
  systemLogsSources = JSON.parse(data);
});

// serve static js + css
app.use('/static', express.static(path.join(__dirname, 'static')));
app.set('views', './views');
app.set('view engine', 'pug')

app.use('/xterm', express.static(path.join(__dirname, 'xterm')));
app.get('/xterm/:ip', function(req, res){
  if (req.params.ip &&
      ipaddr.IPv6.isValid(req.params.ip)) {
    tgNodeIp = req.params.ip;
    res.sendFile(__dirname + '/xterm/index.html');
  } else {
    res.sendFile(__dirname + '/xterm/invalid.html');
  }
});
app.get('/style.css', function(req, res){
  res.sendFile(__dirname + '/xterm/style.css');
});
app.get('/main.js', function(req, res){
  res.sendFile(__dirname + '/xterm/main.js');
});

app.post('/terminals', function (req, res) {
  var cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : './term.sh', [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.PWD,
        env: process.env
      });

  term.write(tgNodeIp + '\r');
  tgNodeIp = null;

  terminals[term.pid] = term;
  logs[term.pid] = '';
  term.on('data', function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post('/terminals/:pid/size', function (req, res) {
  var pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.ws('/terminals/:pid', function (ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log('Connected to terminal ' + term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function(data) {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function(msg) {
    term.write(msg);
  });
  ws.on('close', function () {
    try {
      process.kill(term.pid);
    } catch (e) {
      console.log("Terminal already closed");
    }
    console.log('Closed terminal ' + term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

// single node
app.get(/\/chart\/([a-z_]+)\/([a-z0-9\:\,]+)$/i, function (req, res, next) {
  queryHelper.query(req, res, next);
});
app.get(/\/getEventLogsTables/, function(req, res, next) {
  res.json(eventLogsTables);
});
app.get(/\/getEventLogs\/(.+)\/([0-9]+)\/([0-9]+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let tableName = req.params[0];
  let from = parseInt(req.params[1]);
  let size = parseInt(req.params[2]);
  let topologyName = req.params[3];
  let dbPartition = req.params[4];
  let topology = getTopologyByName(topologyName);

  var mac_addr = [];
  if (topology) {
    let nodes = topology.topology.nodes;
    for (var j = 0; j < nodes.length; j++) {
      mac_addr.push(nodes[j].mac_addr);
    }

    for (var i = 0, len = eventLogsTables.tables.length; i < len; i++) {
      if(tableName == eventLogsTables.tables[i].name) {
        queryHelper.fetchEventLogs(res, mac_addr, eventLogsTables.tables[i].category, from, size, dbPartition);
        break;
      }
    }
  }
});
app.get(/\/getSystemLogsSources/, function(req, res, next) {
  res.json(systemLogsSources);
});
app.get(/\/getSystemLogs\/(.+)\/([0-9]+)\/([0-9]+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let sourceName = req.params[0];
  let offset = parseInt(req.params[1]);
  let size = parseInt(req.params[2]);
  let mac_addr =  req.params[3];
  let date =  req.params[4];
  for (var i = 0, len = systemLogsSources.sources.length; i < len; i++) {
    if(sourceName == systemLogsSources.sources[i].name) {
      queryHelper.fetchSysLogs(res, mac_addr, systemLogsSources.sources[i].index, offset, size, date);
      break;
    }
  }
});
app.get(/\/getAlerts\/(.+)\/([0-9]+)\/([0-9]+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let from = parseInt(req.params[1]);
  let size = parseInt(req.params[2]);
  let topology = getTopologyByName(topologyName);

  var mac_addr = [];
  if (topology) {
    let nodes = topology.topology.nodes;
    for (var j = 0; j < nodes.length; j++) {
      mac_addr.push(nodes[j].mac_addr);
    }
    queryHelper.fetchAlerts(res, mac_addr, from, size);
  }
});
app.get(/\/clearAlerts\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let topology = getTopologyByName(topologyName);

  var mac_addr = [];
  if (topology) {
    let nodes = topology.topology.nodes;
    for (var j = 0; j < nodes.length; j++) {
      mac_addr.push(nodes[j].mac_addr);
    }
    queryHelper.deleteAlertsByMac(res, mac_addr);
  }
});
app.get(/\/deleteAlerts\/(.+)$/i, function (req, res, next) {
  let ids = JSON.parse(req.params[0]);
  queryHelper.deleteAlertsById(req, ids);
});
app.post(/\/event\/?$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // push query
    let httpData = JSON.parse(httpPostData)[0];
    let keyIds = queryHelper.fetchLinkKeyIds('fw_uptime', httpData.a_node, httpData.z_node);
    if (!keyIds.length) {
      // key not found
      res.status(500).send("Key not found").end();
      return;
    }
    let now = new Date().getTime() / 1000;
    let eventQuery = {
      type: "event",
      key_ids: keyIds,
      data: [{keyId: keyIds[0], key: "fw_uptime"}],
      min_ago: 24 * 60,
      start_ts: now - (24 * 60),
      end_ts: now,
      agg_type: "event",
    };
    let chartUrl = 'http://localhost:8086/query';
    let queryRequest = {queries: [eventQuery]};
    request.post({url: chartUrl,
                  body: JSON.stringify(queryRequest)}, (err, httpResponse, body) => {
      if (err) {
        console.error("Error fetching from beringei:", err);
        res.status(500).send("Error fetching data").end();
        return;
      }
      res.send(httpResponse.body).end();
    });
  });
});

// newer charting, for multi-linechart/row
app.post(/\/multi_chart\/$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // proxy query
    let chartUrl = 'http://localhost:8086/query';
    let httpData = JSON.parse(httpPostData);
    let queryRequest = {queries: httpData};
    request.post({url: chartUrl,
                  body: JSON.stringify(queryRequest)}, (err, httpResponse, body) => {
      if (httpResponse) {
        res.send(httpResponse.body).end();
      } else {
        res.status(500).send("No Data").end();
      }
    });
  });
});
// metric lists
app.post(/\/metrics$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // push query
    queryHelper.fetchMetricNames(res, httpPostData);
  });
});

// raw stats data
app.get(/\/health\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  if (networkHealth.hasOwnProperty(topologyName)) {
    res.send(networkHealth[topologyName]).end();
  } else {
    console.log('No cache found for', topologyName);
    res.send("No cache").end();
  }
});

function refreshNetworkHealth(topologyName) {
  let liveTopology = topologyByName[topologyName];
  let topology = (liveTopology && liveTopology.nodes) ?
                  liveTopology : fileTopologyByName[topologyName];
  if (!topology) {
    return;
  }
  let nodeMetrics = [
    {
      "name": "minion_uptime",
      "metric": "e2e_minion.uptime",
      "type": "event_sec",
      "time": 24 * 60 * 60 /* 24 hours */
    }
  ];
  let linkMetrics = [
    {
      "name": "alive",
      "metric": "fw_uptime",
      "type": "event_keepalive",
      "time": 24 * 60 * 60 /* 24 hours */
    }
  ];
  let startTime = new Date();
  let queries = queryHelper.makeTableQuery(undefined, topology, nodeMetrics, linkMetrics);
  let chartUrl = 'http://localhost:8086/query';
  request.post({url: chartUrl,
                body: JSON.stringify(queries)}, (err, httpResponse, body) => {
    if (err) {
      console.error("Error fetching from beringei:", err);
      return;
    }
    let totalTime = new Date() - startTime;
    console.log('Fetched health for', topologyName,'in', totalTime, 'ms');
    // join the results
    networkHealth[topologyName] = httpResponse.body;
  });
}

// raw stats data
app.get(/\/overlay\/linkStat\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let metricName = req.params[1];
  let liveTopology = topologyByName[topologyName];
  let topology = (liveTopology && liveTopology.nodes) ?
                  liveTopology : fileTopologyByName[topologyName];
  if (!topology) {
    res.status(500).send('No topology data for: ' + topologyName);
    return;
  }
  let queryRequest = queryHelper.makeTableQuery(res, topology, [], [metricName], "key_ids", "none", 10 * 60);
  let chartUrl = 'http://localhost:8086/query';
  request.post({url: chartUrl,
                body: JSON.stringify(queryRequest)}, (err, httpResponse, body) => {
    if (err) {
      console.error("Error fetching from beringei:", err);
      res.status(500).send("Error fetching data").end();
      return;
    }
    res.send(httpResponse.body).end();
  });
});

// proxy requests for OSM to a v6 endpoint
app.get(/^\/tile\/(.+)\/(.+)\/(.+)\/(.+)\.png$/, function(req, res, next) {
  let s = req.params[0];
  let z = req.params[1];
  let x = req.params[2];
  let y = req.params[3];
  // fetch png
  let tileUrl = 'http://orm.openstreetmap.org/' + z + '/' + x +
                '/' + y + '.png';
  request(tileUrl).pipe(res);
});

app.get(/\/topology\/static$/, function(req, res, next) {
  fs.readFile(NETWORK_CONFIG_PATH + NETWORK_CONFIG, 'utf-8', (err, data) => {
    // unable to open file, exit
    if (err) {
      res.status(500).send(err.stack);
      return;
    }
    // serialize some example
    let networkConfig = JSON.parse(data);

    res.json(networkConfig);
  });
});

app.get(/\/topology\/list$/, function(req, res, next) {
  res.json(Object.keys(configByName).map(keyName => configByName[keyName]));
});

app.get(/\/topology\/get\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let topology = getTopologyByName(topologyName);

  if (Object.keys(topology).length > 0) {
    res.json(topology);
    return;
  }
  res.status(404).end("No such topology\n");
});

app.get(/\/topology\/get_stateless\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let networkConfig = Object.assign({}, getTopologyByName(topologyName));
  let topology = networkConfig.topology;
  if (topology) {
    // when config is downloaded we shouldn't show any status
    // injected by the running e2e controller
    if (topology.links) {
      topology.links.forEach(link => {
        delete link['linkup_attempts'];
        link.is_alive = false;
      });
    }
    if (topology.nodes) {
      topology.nodes.forEach(node => {
        delete node['status_dump'];
        // add missing parameters?
        if (!node.hasOwnProperty("ant_azimuth")) {
          node.ant_azimuth = 0;
        }
        if (!node.hasOwnProperty("ant_elevation")) {
          node.ant_elevation = 0;
        }
        node.status = 1 /* OFFLINE */;
        //delete node['polarity'];
        if (node.golay_idx &&
            node.golay_idx.hasOwnProperty('txGolayIdx') &&
            node.golay_idx.hasOwnProperty('rxGolayIdx')) {
          if (typeof node.golay_idx.txGolayIdx != "number" &&
              typeof node.golay_idx.rxGolayIdx != "number" &&
              node.golay_idx.txGolayIdx != null &&
              node.golay_idx.rxGolayIdx != null) {
            let txGolayIdx = Buffer.from(node.golay_idx.txGolayIdx.buffer.data).readUIntBE(0, 8);
            let rxGolayIdx = Buffer.from(node.golay_idx.rxGolayIdx.buffer.data).readUIntBE(0, 8);
            // update golay by parsing int buffer
            node.golay_idx.rxGolayIdx = rxGolayIdx;
            node.golay_idx.txGolayIdx = txGolayIdx;
          }
        }
      });
    }
    res.json(networkConfig);
    return;
  }
  res.status(404).end("No such topology\n");
});

app.use(/\/topology\/fetch\/(.+)$/i, function (req, res, next) {
  let controllerIp = req.params[0];
  const ctrlProxy = new syncWorker.ControllerProxy(controllerIp);
  ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_TOPOLOGY, '\0');
  ctrlProxy.on('event', (type, success, response_time, data) => {
    switch (type) {
      case Controller_ttypes.MessageType.GET_TOPOLOGY:
        if (success) {
          res.json(data.topology);
        } else {
          res.status(500).end();
        }
        break;
    }
  });
});
app.get(/\/dashboards\/get\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  if (!dashboards[topologyName]) {
    dashboards[topologyName] = {};
  }
  res.json(dashboards[topologyName]);
});

app.post(/\/dashboards\/save\/$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    if (!httpPostData.length) {
      return;
    }
    let data = JSON.parse(httpPostData);
    if (data.topologyName && data.dashboards) {
      dashboards[data.topologyName] = data.dashboards;
      fs.writeFile('./config/dashboards.json', JSON.stringify(dashboards, null, 4), function(err) {
        if (err) {
          res.status(500).end("Unable to save");
          console.log('Unable to save', err);
          return;
        }
        res.status(200).end("Saved");
      });
    } else {
      res.status(500).end("Bad Data");
      return;
    }
  });
});
app.get(/\/controller\/setlinkStatus\/(.+)\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let nodeA = req.params[1];
  let nodeZ = req.params[2];
  let status = req.params[3] == "up" ? true : false;
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'setLinkStatus',
    topology: topology,
    nodeA: nodeA,
    nodeZ: nodeZ,
    status: status,
  }, "", res);
});

app.get(/\/controller\/addLink\/(.+)\/(.+)\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let linkName = req.params[1];
  let nodeA = req.params[2];
  let nodeZ = req.params[3];
  let linkType = req.params[4] == 'WIRELESS' ? 1 : 2;
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'addLink',
    topology: topology,
    linkName: linkName,
    nodeA: nodeA,
    nodeZ: nodeZ,
    linkType: linkType,
  }, "", res);
});

app.post(/\/controller\/addNode$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    let topologyName = postData.topology;
    var topology = getTopologyByName(topologyName);
    syncWorker.sendCtrlMsgSync({
      type: 'addNode',
      topology: topology,
      node: postData.newNode
    }, "", res);
  });
});

app.post(/\/controller\/addSite$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    let topologyName = postData.topology;
    var topology = getTopologyByName(topologyName);
    syncWorker.sendCtrlMsgSync({
      type: 'addSite',
      topology: topology,
      site: postData.newSite
    }, "", res);
  });
});

app.get(/\/controller\/delLink\/(.+)\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let nodeA = req.params[1];
  let nodeZ = req.params[2];
  let forceDelete = req.params[3] == "force" ? true : false;
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'delLink',
    topology: topology,
    nodeA: nodeA,
    nodeZ: nodeZ,
    forceDelete: forceDelete,
  }, "", res);
});

app.get(/\/controller\/delNode\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let nodeName = req.params[1];
  let forceDelete = req.params[2] == "force" ? true : false;
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'delNode',
    topology: topology,
    node: nodeName,
    forceDelete: forceDelete,
  }, "", res);
});

app.get(/\/controller\/renameSite\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let siteName = req.params[1];
  let newSiteName = req.params[2];
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'editSite',
    topology: topology,
    siteName: siteName,
    newSiteName: newSiteName,
  }, "", res);
});

app.get(/\/controller\/renameNode\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let nodeName = req.params[1];
  let newNodeName = req.params[2];
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'editNode',
    topology: topology,
    nodeName: nodeName,
    newNodeName: newNodeName,
  }, "", res);
});

app.get(/\/controller\/setMac\/(.+)\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let nodeName = req.params[1];
  let nodeMac = req.params[2];
  let force = req.params[3] == "force";
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'setMac',
    topology: topology,
    node: nodeName,
    mac: nodeMac,
    force: force,
  }, "", res);
});

app.post(/\/controller\/fulcrumSetMac$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // Fulcrum needs to receive a 200 whether we care about this webhook or not

    if (!httpPostData.length) {
      res.status(200).end();
      return;
    }

    let hookData;
    // Attempt to parse the payload as JSON
    try {
      hookData = JSON.parse(httpPostData);
    } catch (ex) {
      console.error('JSON parse error on Fulcurm endpoint: ', httpPostData);
      res.status(200).end();
      return;
    }

    let record;
    let sectors;
    // Validate JSON content with some basic sanity checks
    try {
      // Only care about hooks from the installer app
      if (hookData['data']['form_id'] !== '299399ce-cd92-4cda-8b76-c57ebb73ab33') {
        console.error('Fulcurm endpoint received webhook from wrong app: ', hookData);
        res.status(200).end();
        return;
      }
      // Only care about record updates, they'll have the MACs
      if (hookData['type'] !== 'record.update') {
        console.error('Fulcurm endpoint received non-update webhook: ', hookData);
        res.status(200).end();
        return;
      }

      record = hookData['data']['form_values'];

      // Hacky static definition of Fulcrum's UID-based form field representations
      sectors = record['b15d'];
    } catch (e) {
      console.error('JSON data doesn\'t contain required info: ', hookData);
      res.status(200).end();
      return;
    }

    let anyInstalled = false;
    sectors.forEach(sector => {
      if (sector['form_values']['dfa8'] === 'Installed') {
        anyInstalled = true;
      }
    });

    if (!anyInstalled) {
      console.error('None of the sectors in this webhook are installed: ', hookData);
      res.status(200).end();
      return;
    }

    let notInstalledCount = 0;
    let topology = getTopologyByName('SJC');
    let nodeToMacList = {};
    sectors.forEach((sector, index) => {
      // Skip node if it's status isn't 'installed' in Fulcrum
      if (sector['form_values']['dfa8'] !== 'Installed') {
        notInstalledCount += 1;
        return;
      }
      let nodeMac = sector['form_values']['f7f1'];
      let nodeName = sector['form_values']['3546'];
      nodeToMacList[nodeName] = nodeMac;
      console.log('Fulcrum setting MAC ' + nodeMac + ' on ' + nodeName);
    });
    try {
      syncWorker.sendCtrlMsgSync({
        type: 'setMacList',
        topology: topology,
        nodeToMac: nodeToMacList,
        force: false,
      }, "", res);
    } catch (e) {
      console.log('Error while Fulcrum setting Mac: ' + e);
    }
    // In the case that nothing is installed still need to respond
    if (notInstalledCount === sectors.length) {
      res.status(200).end();
    }
  });
});

app.get(/\/controller\/getIgnitionState\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'getIgnitionState',
    topology: topology,
  }, "", res);
});

app.get(/\/controller\/setNetworkIgnitionState\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let state = req.params[1] == "enable";
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'setNetworkIgnitionState',
    topology: topology,
    state: state,
  }, "", res);
});

app.get(/\/controller\/setLinkIgnitionState\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let linkName = req.params[1];
  let state = req.params[2] == "enable" ? true : false;
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'setLinkIgnitionState',
    topology: topology,
    linkName: linkName,
    state: state,
  }, "", res);
});

app.get(/\/controller\/rebootNode\/(.+)\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let nodeName = req.params[1];
  let forceReboot = req.params[2] == "force" ? true : false;
  var topology = getTopologyByName(topologyName);
  const SECONDS_TO_REBOOT = 5;

  syncWorker.sendCtrlMsgSync({
    type: 'rebootNode',
    topology: topology,
    forceReboot: forceReboot,
    nodes: [nodeName],
    secondsToReboot: SECONDS_TO_REBOOT,
  }, "", res);
});

app.get(/\/controller\/delSite\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let siteName = req.params[1];
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'delSite',
    topology: topology,
    site: siteName
  }, "", res);
});

// upgrade endpoints $/i
app.post(/\/controller\/prepareUpgrade$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    const {
      topologyName, isHttp, requestId, excludeNodes, imageUrl, md5, timeout, skipFailure, limit, downloadAttempts, torrentParams,
    } = postData;

    var topology = getTopologyByName(topologyName);

    syncWorker.sendCtrlMsgSync({
      type: 'prepareUpgrade',
      upgradeGroupType: 'NETWORK',
      requestId,
      excludeNodes,
      imageUrl,
      md5,
      timeout,
      skipFailure,
      limit,
      isHttp,
      downloadAttempts,
      torrentParams,
      topology
    }, "", res);
  });
});

app.post(/\/controller\/commitUpgrade$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    const {ugType, topologyName, requestId, nodes, excludeNodes, timeout, skipFailure, limit, skipLinks, scheduleToCommit} = postData;

    var topology = getTopologyByName(topologyName);

    syncWorker.sendCtrlMsgSync({
      type: 'commitUpgrade',
      upgradeGroupType: ugType,
      requestId,
      nodes,
      excludeNodes,
      timeout,
      skipFailure,
      limit,
      skipLinks,
      scheduleToCommit,
      topology
    }, "", res);
  });
});

app.post(/\/controller\/commitUpgradePlan$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    const {topologyName, limit, excludeNodes} = postData;

    var topology = getTopologyByName(topologyName);

    syncWorker.sendCtrlMsgSync({
      type: 'commitUpgradePlan',
      limit,
      excludeNodes,
      topology
    }, "", res);
  });
});

app.post(/\/controller\/abortUpgrade$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    const {abortAll, reqIds, topologyName} = postData;

    var topology = getTopologyByName(topologyName);

    syncWorker.sendCtrlMsgSync({
      type: 'abortUpgrade',
      abortAll,
      reqIds,
      topology
    }, "", res);
  });
});

app.post(/\/controller\/uploadUpgradeBinary$/i, upload.single('binary'), function (req, res, next) {
  // thrift calls and stuff here
  const {topologyName} = req.body;
  const topology = getTopologyByName(topologyName);

  const urlPrefix = req.protocol + '://' + req.get('host');
  const uriPath = querystring.escape(req.file.filename);
  const imagePath = `${urlPrefix}${NETWORK_UPGRADE_IMAGES_REL_PATH}/${uriPath}`;

  syncWorker.sendCtrlMsgSync({
    type: 'addUpgradeImage',
    topology: topology,
    imagePath: imagePath
  }, '', res);
});

app.get(/\/controller\/listUpgradeImages\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'listUpgradeImages',
    topology: topology
  }, '', res);
});

app.get(/\/controller\/deleteUpgradeImage\/(.+)\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const imageName = req.params[1];

  const topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'deleteUpgradeImage',
    topology: topology,
    name: imageName
  }, '', res);
});

// network config endpoints
app.get(/\/controller\/getBaseConfig$/i, (req, res, next) => {
  const {topologyName, imageVersions} = req.query;
  const topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'getBaseConfig',
    topology: topology,
    imageVersions: imageVersions,
  }, '', res);
});

app.get(/\/controller\/getNetworkOverrideConfig/i, (req, res, next) => {
  const {topologyName} = req.query;
  const topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'getNetworkOverrideConfig',
    topology: topology,
  }, '', res);
});

app.get(/\/controller\/getNodeOverrideConfig/i, (req, res, next) => {
  const {topologyName, nodes} = req.query;
  const topology = getTopologyByName(topologyName);

  const nodeMacs = nodes ?
    nodes : topology.topology.nodes.map(node => node.mac_addr);

  syncWorker.sendCtrlMsgSync({
    type: 'getNodeOverrideConfig',
    topology: topology,
    nodes: nodeMacs,
  }, '', res);
});

app.post(/\/controller\/setNetworkOverrideConfig/i, (req, res, next) => {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    const {config, topologyName} = postData;
    const topology = getTopologyByName(topologyName);

    syncWorker.sendCtrlMsgSync({
      type: 'setNetworkOverrideConfig',
      topology: topology,
      config: config,
    }, '', res);
  });
});

app.post(/\/controller\/setNodeOverrideConfig/i, (req, res, next) => {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    let postData = JSON.parse(httpPostData);
    const {config, topologyName} = postData;
    const topology = getTopologyByName(topologyName);

    syncWorker.sendCtrlMsgSync({
      type: 'setNodeOverrideConfig',
      topology: topology,
      config: config,
    }, '', res);
  });
});

// aggregator endpoints

app.get(/\/aggregator\/getStatusDump\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  if (!configByName[topologyName]) {
    res.status(404).end("No such topology\n");
    return;
  }
  res.json({
    status: aggrStatusDumpsByName[topologyName],
    AdjMapAcuum: adjacencyMapsByName[topologyName],
  });
});

app.get(/\/aggregator\/getAlertsConfig\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  if (!configByName[topologyName]) {
    res.status(404).end("No such topology\n");
    return;
  }
  aggregatorProxy.getAlertsConfig(configByName[topologyName], req, res, next);
});

app.get(/\/aggregator\/setAlertsConfig\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  if (!configByName[topologyName]) {
    res.status(404).end("No such topology\n");
    return;
  }
  aggregatorProxy.setAlertsConfig(configByName[topologyName], req, res, next);
});

// api handler
require('./api/api.js')(app, configByName, fileTopologyByName, topologyByName);

if (devMode) {
  // serve developer, non-minified build
  const config = require('./webpack.config.js');
  const compiler = webpack(config);
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: 'src',
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
} else {
  // serve js from dist/ in prod mode
  app.get('/map.js', function(req, res) {
    res.sendFile(__dirname + '/dist/map.js');
  });
  app.get('/bootstrap.css', function(req, res) {
    res.sendFile(__dirname + '/dist/bootstrap.css');
  });
}

app.get(/\/*/, function(req, res) {
  res.render('index', {configJson: JSON.stringify(networkInstanceConfig)});
});

app.listen(port, '', function onStart(err) {
  if (err) {
    console.log(err);
  }
  if (devMode) {
    console.log('<=========== DEVELOPER MODE ===========>');
  } else {
    console.log('<=========== PRODUCTION MODE ==========>');
    console.log('<== JS BUNDLE SERVED FROM /static/js ==>');
    console.log('<==== LOCAL CHANGES NOT POSSIBLE ======>');
  }
  console.log('\n=========> LISTENING ON PORT %s', port);
});
