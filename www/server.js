/* eslint no-console: 0 */

const path = require('path');
const fs = require('fs');
const request = require('request');
const express = require('express');
const pug = require('pug');
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
dataJson.init();
dataJson.refreshNodes();
dataJson.refreshNodeCategories();
dataJson.timeAlloc();
dataJson.scheduleTimeAlloc();
const aggregatorProxy = require('./aggregatorProxy');
const ipaddr = require('ipaddr.js');
const expressWs = require('express-ws')(app);
const os = require('os');
const pty = require('pty.js');

const statusReportExpiry = 2 * 60000; // 2 minuets

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
worker.on('message', (msg) => {
  const config = configByName[msg.name];
  switch (msg.type) {
    case 'topology_update':
      // log online/offline changes
      if (config.controller_online != msg.success) {
        console.log(new Date().toString(), msg.name, 'controller',
                    (msg.success ? 'online' : 'offline'));
      }
      config.controller_online = msg.success;
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
                    (msg.success ? 'online' : 'offline'));
      }
      config.aggregator_online = msg.success;
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

// Read list of networks and start timer to pull network status/topology
fs.readFile(NETWORK_CONFIG_INSTANCES_PATH + networkConfig, 'utf-8', (err, data) => {
  // unable to open file, exit
  if (err) {
    res.status(500).send(err.stack);
    return;
  }
  // serialize some example
  networkInstanceConfig = JSON.parse(data);
  if ('topologies' in networkInstanceConfig) {
    let topologies = networkInstanceConfig['topologies'];
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
      configByName[topology['name']] = config;
      fileTopologyByName[topology['name']] = topology;

      let topologyName = topology['name'];
      fileSiteByName[topologyName] = {};
      topology.sites.forEach((site) => {
        fileSiteByName[topologyName][site.name] = site;
      });
    });
  }

  let refresh_interval = 5000;
  if ('refresh_interval' in networkInstanceConfig) {
    refresh_interval = networkInstanceConfig['refresh_interval'];
  }
  // start poll request interval
  setInterval(() =>
    {
      worker.send({
        type: 'poll',
        topologies: Object.keys(configByName).map(keyName => configByName[keyName]),
      });
    }, refresh_interval);
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
app.set('views', './views');
app.set('view engine', 'pug')
app.get('/', function(req, res) {
  res.render('index', {configJson: JSON.stringify(networkInstanceConfig)});
});
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
  let liveTopology = topologyByName[topologyName];
  let topology = (liveTopology && liveTopology.nodes) ?
                  liveTopology : fileTopologyByName[topologyName];
  if (!topology) {
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
  res.json(Object.keys(configByName).map(keyName => configByName[keyName]));
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
  }, res);
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
  }, res);
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
    }, res);
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
    }, res);
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
  }, res);
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
  }, res);
});

app.get(/\/controller\/delSite\/(.+)\/(.+)$/i, function (req, res, next) {
  let topologyName = req.params[0];
  let siteName = req.params[1];
  var topology = getTopologyByName(topologyName);

  syncWorker.sendCtrlMsgSync({
    type: 'delSite',
    topology: topology,
    site: siteName
  }, res);
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
  aggregatorProxy.getAlertsConfig(configs, req, res, next);
});
app.get(/\/aggregator\/setAlertsConfig\/(.+)\/(.+)$/i, function (req, res, next) {
  aggregatorProxy.setAlertsConfig(configs, req, res, next);
});

app.listen(port, '', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
