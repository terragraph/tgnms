/* eslint no-console: 0 */

const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');
const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping && process.env.PORT ? process.env.PORT : 8080;
const app = express();
const fs = require('fs');
const influxHelper = require('./influx');
const controllerProxy = require('./controllerProxy');

var fileTopologies = [];
var configs = [];
var topologies_index = 0;
var receivedTopologies = [];
var statusDumps = [];

function periodicNetworkStatus() {
  for (var i = 0, len = configs.length; i < len; i++) {
    controllerProxy.getTopology(i, configs, receivedTopologies);
    controllerProxy.getStatusDump(i, configs, statusDumps);
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
  fs.readFile('./config/network_config.materialized_JSON', 'utf-8', (err, data) => {
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
        let topology = topologyConfig['topology'];
        let config = {
            name: topology['name'],
            controller_ip: topologyConfig['controller_ip']
        };
        configs.push(config);
        fileTopologies.push(topology);
      });
    }
    setInterval(periodicNetworkStatus, 5000);
  });


  // serve static js + css
  app.use('/static', express.static(path.join(__dirname, 'static')));
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
  // single node
  app.get(/\/influx\/([a-z_]+)\/([a-z0-9\:\,]+)$/i, function (req, res, next) {
    influxHelper.query(req, res, next);
  });
  app.get(/\/topology\/static$/, function(req, res, next) {
    fs.readFile('./config/network_config.materialized_JSON', 'utf-8', (err, data) => {
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
        let status = statusDumps[i];
        let nodes = topology.nodes;
        for (var j = 0; j < nodes.length; j++) {
          if (status && status.statusReports) {
            topology.nodes[j]["status"] = status.statusReports[nodes[j].mac_addr];
          }
        }
        res.json(topology);
        return;
      }
      // return error on unknown topology
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
