/* eslint no-console: 0 */

const path = require('path');
const fs = require('fs');
const request = require('request');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping && process.env.PORT ? process.env.PORT : 8080;
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
const queryHelper = require('./queryHelper');
queryHelper.refreshKeyNames();
setInterval(queryHelper.refreshKeyNames, 30000);

// new json writer
const dataJson = require('./dataJson');
// load the initial node/key ids and time slots
dataJson.refreshNodeIds();
dataJson.refreshNodeFilenames();
dataJson.refreshNodeCategories();
dataJson.timeAlloc();
dataJson.scheduleTimeAlloc();
const controllerProxy = require('./controllerProxy');
const aggregatorProxy = require('./aggregatorProxy');
const ipaddr = require('ipaddr.js');
const expressWs = require('express-ws')(app);
const os = require('os');
const pty = require('pty.js');

var fileTopologies = [];
var configs = [];
var eventLogsTables = {};
var systemLogsSources = {};
var topologies_index = 0;
var receivedTopologies = [];
var ctrlStatusDumps = [];
var aggrStatusDumps = [];

var terminals = {},
    logs = {};

var tgNodeIp = null;

function periodicNetworkStatus() {
  for (var i = 0, len = configs.length; i < len; i++) {
    controllerProxy.getTopology(i, configs, receivedTopologies);
    controllerProxy.getStatusDump(i, configs, ctrlStatusDumps);
    aggregatorProxy.getStatusDump(i, configs, aggrStatusDumps);
  }
}

function getTopologyByName(topologyName) {
  for (var i = 0, len = configs.length; i < len; i++) {
    if(topologyName == configs[i].name) {
      let topology = {};
      // ensure received topology looks valid-ish before using
      if (receivedTopologies[i] && receivedTopologies[i].nodes) {
        topology = receivedTopologies[i];
      } else {
        topology = fileTopologies[i];
      }
      // over-ride the topology name since many don't use
      if (!topology.name) {
        console.error('No topology name received from controller for',
                      configs[i].name, '[', configs[i].controller_ip, ']');
        // force the original name if the controller has no name
        topology.name = fileTopologies[i].name;
      }
      let status = ctrlStatusDumps[i];
      let nodes = topology.nodes;
      for (var j = 0; j < nodes.length; j++) {
        if (status && status.statusReports) {
          topology.nodes[j]["status_dump"] =
            status.statusReports[nodes[j].mac_addr];
        }
      }
      let networkConfig = Object.assign({}, configs[i]);
      networkConfig.topology = topology;
      if (configs[i].site_coords_override) {
        // swap site data
        networkConfig.topology.sites = fileTopologies[i].sites;
      }
      return networkConfig;
    }
  }
  return {};
}

if (isDeveloping) {
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

  // Read list of networks and start timer to pull network status/topology
  fs.readFile(NETWORK_CONFIG_INSTANCES_PATH + networkConfig, 'utf-8', (err, data) => {
    // unable to open file, exit
    if (err) {
      res.status(500).send(err.stack);
      return;
    }
    // serialize some example
    let networkConfig = JSON.parse(data);
    if ('topologies' in networkConfig) {
      let topologies = networkConfig['topologies'];
      Object.keys(topologies).forEach(function(key) {
        let topologyConfig = topologies[key];
        let topology = JSON.parse(fs.readFileSync(
          NETWORK_CONFIG_NETWORKS_PATH + topologyConfig.topology_file));
        let config = {
            name: topology['name'],
            controller_ip: topologyConfig['controller_ip'],
            aggregator_ip: topologyConfig['aggregator_ip'],
            latitude: topologyConfig['latitude'],
            longitude: topologyConfig['longitude'],
            zoom_level: topologyConfig['zoom_level'],
            controller_online: false,
            aggregator_online: false,
            site_coords_override: topologyConfig['site_coords_override'],
        };
        configs.push(config);
        fileTopologies.push(topology);
      });
    }
    setInterval(periodicNetworkStatus, 5000);
  });
  app.use(/\/stats_writer$/i, function (req, res, next) {
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
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));

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
  app.get(/\/getEventLogs\/(.+)\/([0-9]+)\/([0-9]+)\/(.+)$/i, function (req, res, next) {
    let tableName = req.params[0];
    let from = parseInt(req.params[1]);
    let size = parseInt(req.params[2]);
    let topologyName = req.params[3];
    let topology = getTopologyByName(topologyName);

    var mac_addr = [];
    if (topology) {
      let nodes = topology.topology.nodes;
      for (var j = 0; j < nodes.length; j++) {
        mac_addr.push(nodes[j].mac_addr);
      }

      for (var i = 0, len = eventLogsTables.tables.length; i < len; i++) {
        if(tableName == eventLogsTables.tables[i].name) {
          queryHelper.fetchEventLogs(res, mac_addr, eventLogsTables.tables[i].category, from, size);
          break;
        }
      }
    }
  });
  app.get(/\/getSystemLogsSources/, function(req, res, next) {
    res.json(systemLogsSources);
  });
  app.get(/\/getSystemLogs\/(.+)\/([0-9]+)\/([0-9]+)\/(.+)$/i, function (req, res, next) {
    let sourceName = req.params[0];
    let from = parseInt(req.params[1]);
    let size = parseInt(req.params[2]);
    let mac_addr =  req.params[3];
    for (var i = 0, len = systemLogsSources.sources.length; i < len; i++) {
      if(sourceName == systemLogsSources.sources[i].name) {
        queryHelper.fetchSysLogs(res, mac_addr, systemLogsSources.sources[i].index, from, size);
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
      queryHelper.queryMulti(res, httpPostData, 'event');
    });
  });

  // newer charting, for multi-linechart/row
  app.post(/\/multi_chart\/$/i, function (req, res, next) {
    let httpPostData = '';
    req.on('data', function(chunk) {
      httpPostData += chunk.toString();
    });
    req.on('end', function() {
      // push query
      queryHelper.queryMulti(res, httpPostData, 'chart');
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
    let topology = {};
    for (var i = 0, len = configs.length; i < len; i++) {
      if (topologyName == configs[i].name) {
        // ensure received topology looks valid-ish before using
        if (receivedTopologies[i] && receivedTopologies[i].nodes) {
          topology = receivedTopologies[i];
        } else {
          topology = fileTopologies[i];
        }
      }
    }
    if (!topology.nodes || !topology.nodes.length) {
      res.status(500).send('No topology data for: ' + topologyName);
      return;
    }
    queryHelper.makeTableQuery(res, topology);
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
    res.json(configs);
  });

  app.get(/\/topology\/get\/(.+)$/i, function (req, res, next) {
    let topologyName = req.params[0];
    var topology = getTopologyByName(topologyName);
    if (topology) {
      res.json(topology);
      return;
    }
    res.status(404).end("No such topology\n");
  });

  app.get(/\/aggregator\/getStatusDump\/(.+)$/i, function (req, res, next) {
    let topologyName = req.params[0];
    for (var i = 0, len = configs.length; i < len; i++) {
      if(topologyName == configs[i].name) {
        let statusDump = {};
        if (aggrStatusDumps[i]) {
          statusDump = aggrStatusDumps[i];
        }
        res.json(statusDump);
        return;
      }
    }
    res.status(404).end("No such topology\n");
  });

  app.get(/\/aggregator\/getAlertsConfig\/(.+)$/i, function (req, res, next) {
    aggregatorProxy.getAlertsConfig(configs, req, res, next);
  });
  app.get(/\/aggregator\/setAlertsConfig\/(.+)\/(.+)$/i, function (req, res, next) {
    aggregatorProxy.setAlertsConfig(configs, req, res, next);
  });
} else {
  app.use(express.static(__dirname + '/dist'));
  app.get('*', function response(req, res) {
    res.sendFile(path.join(__dirname, 'dist/map.html'));
  });
}

app.listen(port, '', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
