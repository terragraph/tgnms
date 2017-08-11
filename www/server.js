/* eslint no-console: 0 */

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const request = require('request');
const express = require('express');
const pug = require('pug');
const compression = require('compression');
// worker process
const cp = require('child_process');
const worker = cp.fork('./worker.js');
const syncWorker = require('./worker.js');
// packaging
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping && process.env.PORT ? process.env.PORT : 8080;
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
// load the initial node/key ids and time slots
dataJson.init();
dataJson.refreshNodes();
dataJson.refreshNodeKeys();
dataJson.refreshNodeCategories();
const aggregatorProxy = require('./aggregatorProxy');
const ipaddr = require('ipaddr.js');
const expressWs = require('express-ws')(app);
const os = require('os');
const pty = require('pty.js');

const statusReportExpiry = 2 * 60000; // 2 minuets
const maxThriftRequestFailures = 3;

const IM_SCAN_POLLING_ENABLED = process.env.IM_SCAN_POLLING_ENABLED ?
                                process.env.IM_SCAN_POLLING_ENABLED == '1' : 0;

var refreshIntervalTimer = undefined;
var eventLogsTables = {};
var systemLogsSources = {};
var networkInstanceConfig = {};
// new topology from worker process
var configByName = {};
var fileTopologyByName = {};
var fileSiteByName = {};
var topologyByName = {};
var statusDumpsByName = {};
var aggrStatusDumpsByName = {};
var adjacencyMapsByName = {};

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
    case 'aggr_status_dump_update':
      // log online/offline changes
      if (config.aggregator_online != msg.success) {
        console.log(new Date().toString(), msg.name, 'aggregator',
                    (msg.success ? 'online' : 'offline'),
                    'in', msg.response_time, 'ms');
      }
      config.aggregator_failures = msg.success ? 0 : config.aggregator_failures + 1;
      if (config.aggregator_failures >= maxThriftRequestFailures) {
        config.aggregator_online = false;
      } else {
        config.aggregator_online = true;
      }
      aggrStatusDumpsByName[msg.name] = msg.success ? msg.status_dump : {};
      var currentTime = new Date().getTime();
      // remove nodes with old timestamps in status report
      if (msg.success && msg.status_dump && msg.status_dump.statusReports) {
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
      break;
    default:
      console.error('Unknown message type', msg.type);
  }
});

var terminals = {},
    logs = {};

var allStats = {};

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
  return networkConfig;
}

const compiler = webpack(config);
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
function reloadInstanceConfig() {
  if (refreshIntervalTimer) {
    clearInterval(refreshIntervalTimer);
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
        // original sites take priority, only add missing nodes and sites
        let sitesByName = {};
        topology.sites.forEach(site => {
          sitesByName[site.name] = site;
        });
        if (topologyConfig.topology_overlay_file) {
          let overlayTopology = JSON.parse(fs.readFileSync(
            NETWORK_CONFIG_NETWORKS_PATH + topologyConfig.topology_overlay_file));
          // validation steps when overlay is supposed to have the correct
          // set of sites/sectors
          // * Ensure all sectors, sites, and links in old topology are
          //   listed in new.
          let newSites = {};
          overlayTopology.sites.forEach(site => {newSites[site.name] = site;});
          let newSectors = {};
          let nodesBySite = {};
          overlayTopology.nodes.forEach(node => {
            newSectors[node.name] = node;
            if (!nodesBySite.hasOwnProperty(node.site_name)) {
              nodesBySite[node.site_name] = {};
            }
            nodesBySite[node.site_name][node.name] = 1;
          });
          topology.sites.forEach(site => {
            // ensure old site names are listed in new topology
            if (!newSites.hasOwnProperty(site.name)) {
              console.error('Site from original topology missing in new', site.name);
              // add missing site into new
              overlayTopology.sites.push(site);
              // and all of the sectors
              topology.nodes.forEach(node => {
                if (node.site_name == site.name) {
                  // TODO - verify it does not yet exist
                  overlayTopology.nodes.push(node);
                  console.error('\tAdding missing node', node.name);
                  topology.links.forEach(link => {
                    if (link.a_node_name == node.name ||
                        link.z_node_name == node.name) {
                      console.error('\t\tAdding missing link', link.name);
                      overlayTopology.links.push(link);
                    }
                  });
                }
              });
              // show matching prefixed names
              overlayTopology.sites.forEach(newSite => {
                if (newSite.name.length > site.name.length &&
                    newSite.name.substr(0, site.name.length) == site.name) {
                  console.error('\tPotential match:', newSite.name);
                }
              });
            } else {
              // site exists in new topology, compare nodes in the site
              // iterate over each old sector, see if it exists in the new list
              topology.nodes.forEach(node => {
                if (node.site_name == site.name) {
                  // found a node that exists in this site, make sure it
                  // exists in the new
                  if (!newSectors.hasOwnProperty(node.name)) {
                    console.error('\t\tMissing sector', node.name,
                                  'in new node list');
                  }
                }
              });
            }
          });
          // swap topologies now that we've reconciled
          // move sector data from old -> new (polarity, golay, mac)
          let oldNodes = {};
          topology.nodes.forEach(node => {
            oldNodes[node.name] = node;
          });
          overlayTopology.nodes.forEach(node => {
            if (oldNodes.hasOwnProperty(node.name)) {
              // node exists in existing topology, swap over properties
              let oldNode = oldNodes[node.name];
              node.polarity = oldNode.polarity;
              node.golay_idx = oldNode.golay_idx;
              node.mac_addr = oldNode.mac_addr;
            }
          });
          let oldName = topology.name;
          topology = Object.assign({}, overlayTopology);
          topology.name = oldName;
        }
        let config = topologyConfig;
        config['controller_online'] = false;
        config['controller_failures'] = 0;
        config['aggregator_online'] = false;
        config['aggregator_failures'] = 0;
        config['name'] = topology['name'];
        configByName[topology['name']] = config;
        fileTopologyByName[topology['name']] = topology;
        let topologyName = topology['name'];
        fileSiteByName[topologyName] = {};
        topology.sites.forEach((site) => {
          fileSiteByName[topologyName][site.name] = site;
        });
      });
    } else {
      consott.error('No topologies found in config, failing!');
      process.exit(1)
    }

    let refresh_interval = 5000;
    if ('refresh_interval' in networkInstanceConfig) {
      refresh_interval = networkInstanceConfig['refresh_interval'];
    }
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
app.use(/\/stats_writer$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // relay the msg to datadb
    if (!httpPostData.length) {
      res.status(500).end("No Data");
      return;
    }
    // update mysql time series db
    res.status(204).end("Submitted");
    dataJson.writeData(httpPostData);
  });
});
app.use(/\/logs_writer$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // relay the msg to datadb
    if (!httpPostData.length) {
      return;
    }
    // update mysql time series db
    res.status(204).end("Submitted");
    dataJson.writeLogs(httpPostData);
  });
});
app.use(/\/events_writer$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // relay the msg to datadb
    if (!httpPostData.length) {
      return;
    }
    // update mysql time series db
    res.status(204).end("Submitted");
    dataJson.writeEvents(httpPostData);
  });
});
app.use(/\/alerts_writer$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function(chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function() {
    // relay the msg to datadb
    if (!httpPostData.length) {
      return;
    }
    // update mysql time series db
    res.status(204).end("Submitted");
    dataJson.writeAlerts(httpPostData);
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
    let chartUrl = 'http://localhost:8899/query';
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
    let chartUrl = 'http://localhost:8899/query';
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
  let liveTopology = topologyByName[topologyName];
  let topology = (liveTopology && liveTopology.nodes) ?
                  liveTopology : fileTopologyByName[topologyName];
  if (!topology) {
    res.status(500).send('No topology data for: ' + topologyName);
    return;
  }
  let queries = queryHelper.makeTableQuery(res, topology, 'fw_uptime', "event", "event", 24 * 60 * 60);
  let chartUrl = 'http://localhost:8899/query';
  let queryRequest = {queries: queries};
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
  let queries = queryHelper.makeTableQuery(res, topology, metricName, "key_ids", "none", 10 * 60);
  let chartUrl = 'http://localhost:8899/query';
  let queryRequest = {queries: queries};
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
  if (topology) {
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
      return;
    }
    let hookData = JSON.parse(httpPostData);

    // Only care about hooks from the installer app
    if (hookData['data']['form_id'] !== '299399ce-cd92-4cda-8b76-c57ebb73ab33') {
      return;
    }
    // Only care about record updates, they'll have the MACs
    if (hookData['type'] !== 'record.update') {
      return;
    }

    let record = hookData['data']['form_values'];

    // Hacky static definition of Fulcrum's UID-based form field representations
    let sectors = record['b15d'];

    sectors.forEach((sector, index) => {
      setTimeout(() => {
        try {
          let nodeMac = sector['form_values']['f7f1'];
          let nodeName = sector['form_values']['3546'];
          let sendRes = index >= sectors.length - 1;
          var topology = getTopologyByName('SJC');

          console.log('Fulcrum setting MAC ' + nodeMac + ' on ' + nodeName);

          return syncWorker.sendCtrlMsgSync({
            type: 'setMac',
            topology: topology,
            node: nodeName,
            mac: nodeMac,
            force: false,
          }, "", res, sendRes);
        } catch (e) {
          console.log(e);
        }
      }, 500 * index);
    });
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
  let nodeMac = req.params[1];
  let forceReboot = req.params[2] == "force" ? true : false;
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'rebootNode',
    topology: topology,
    forceReboot: forceReboot,
  }, nodeMac, res);
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

app.use(middleware);
app.use(webpackHotMiddleware(compiler));

app.get(/\/*/, function(req, res) {
  res.render('index', {configJson: JSON.stringify(networkInstanceConfig)});
});

app.listen(port, '', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
