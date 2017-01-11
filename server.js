/* eslint no-console: 0 */

const path = require('path');
const request = require('request');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping && process.env.PORT ? process.env.PORT : 8080;
const app = express();
const fs = require('fs');
const data = require('./data');
const charts = require('./charts');
// load the initial node ids
data.refreshNodeIds();
const elasticHelper = require('./elastic');
const controllerProxy = require('./controllerProxy');
const aggregatorProxy = require('./aggregatorProxy');
const ipaddr = require('ipaddr.js');
const expressWs = require('express-ws')(app);
const os = require('os');
const pty = require('pty.js');

const NETWORK_CONFIG_PATH = './config/networks/';
const NETWORK_CONFIG = 'networks.json';

var fileTopologies = [];
var configs = [];
var elasticTables = {};
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
  fs.readFile(NETWORK_CONFIG_PATH + NETWORK_CONFIG, 'utf-8', (err, data) => {
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
          NETWORK_CONFIG_PATH + topologyConfig.topology_file));
        let config = {
            name: topology['name'],
            controller_ip: topologyConfig['controller_ip'],
            aggregator_ip: topologyConfig['aggregator_ip'],
            latitude: topologyConfig['latitude'],
            longitude: topologyConfig['longitude'],
            zoom_level: topologyConfig['zoom_level'],
            controller_online: false,
            aggregator_online: false,
        };
        configs.push(config);
        fileTopologies.push(topology);
      });
    }
    setInterval(periodicNetworkStatus, 5000);
  });

  // datadb write proxy
  app.use(/\/write$/i, function (req, res, next) {
    let dbName = req.query.db;
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
      res.status(200).end("Submitted");
      data.writeData(httpPostData);
    });
  });
  // Read list of event logging Tables
  fs.readFile('./config/event_logging_tables.json', 'utf-8', (err, data) => {
    // unable to open file, exit
    if (err) {
      res.status(500).send(err.stack);
      return;
    }
    // serialize some example
    elasticTables = JSON.parse(data);
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
    charts.query(req, res, next);
  });
  app.get(/\/elastic\/getTables/, function(req, res, next) {
    res.json(elasticTables);
  });
  app.get(/\/elastic\/execute\/(.+)\/([0-9]+)\/([0-9]+)\/(.+)\/(.+)$/i, function (req, res, next) {
    elasticHelper.execute(elasticTables, req, res, next);
  });

  // all charting
  app.post(/\/chart\/$/i, function (req, res, next) {
    let httpPostData = '';
    req.on('data', function(chunk) {
      httpPostData += chunk.toString();
    });
    req.on('end', function() {
      // push query
      charts.queryObj(res, httpPostData);
    });
  });
  // NEWer charting, for multi-linechart/row
  app.post(/\/multi_chart\/$/i, function (req, res, next) {
    let httpPostData = '';
    req.on('data', function(chunk) {
      httpPostData += chunk.toString();
    });
    req.on('end', function() {
      // push query
      charts.queryMulti(res, httpPostData);
    });
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
    for (var i = 0, len = configs.length; i < len; i++) {
      if(topologyName == configs[i].name) {
        let topology = {};
        if (receivedTopologies[i] && receivedTopologies[i].name) {
          topology = receivedTopologies[i];
        } else {
          topology = fileTopologies[i];
        }
        let status = ctrlStatusDumps[i];
        let nodes = topology.nodes;
        for (var j = 0; j < nodes.length; j++) {
          if (status && status.statusReports) {
            topology.nodes[j]["status"] = status.statusReports[nodes[j].mac_addr];
          }
        }
        let networkConfig = Object.assign({}, configs[i]);
        networkConfig.topology = topology;
        res.json(networkConfig);
        return;
      }
      // return error on unknown topology
    }
    res.status(404).end("No such topology\n");
  });

  app.get(/\/aggregator\/get\/(.+)$/i, function (req, res, next) {
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
