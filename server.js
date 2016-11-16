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
const zmq = require('zmq');
// db
const Influx = require('influx');
const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'cxl',
  schema: [
    {
      measurement: 'value',
      fields: {
        name: Influx.FieldType.STRING,
        node: Influx.FieldType.STRING,
      },
      tags: [
        'name',
        'node',
      ]
    }
  ]
});

function _readTopologyFromFile(reqConfigName, res) {
  // read from file
  fs.readFile('./config/network_config.materialized_JSON', 'utf-8', (err, data) => {
    // unable to open file, exit
    if (err) {
      console.error(err);
      res.status(500).send(err.stack);
      return;
    }
    // serialize some example
    let networkConfig = JSON.parse(data);
    if ('topologies' in networkConfig) {
      let topologies = networkConfig['topologies'];
      Object.keys(topologies).forEach(function(key) {
        let topologyConfig = topologies[key];
        //console.log(topologyConfig);
        let topology = topologyConfig['topology'];
        let nodes = topology['nodes'];
        let configName = topology['name'];
        if (configName == reqConfigName) {
          res.json(topologyConfig);
          return;
        }
      });
    }
    // return error on unknown topology
    res.status(404).end("No such topology\n");
  });
}


const thrift = require('thrift');
var ControllerProxyService = require('./thrift/gen-nodejs/ControllerProxyService');
var ControllerProxyTypes = require('./thrift/gen-nodejs/ControllerProxy_types');

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

  // serve static js + css
  app.use('/static', express.static(path.join(__dirname, 'static')));
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
  // single node, multiple terms
  app.get(/\/influx\/([a-z0-9\:]+)\/([a-z0-9_\,\.]+)$/i, function (req, res, next) {
    let nodeMac = req.params[0];
    let metricNames = req.params[1].split(",");
    // split node macs
    let queries = metricNames.map(metric => {
      let query =
        "SELECT \"name\",\"value\" FROM \"system\" WHERE \"name\" = '" +
        metric + "' AND (\"node\" = '" + nodeMac + "') " +
        "AND time > (NOW() - 5m)";
      return query;
    });
    influx.query(queries).then(result => {
      res.json(result);
    }).catch(err => {
      console.log(err);
      res.status(500).send(err.stack);
    });
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
    fs.readFile('./config/network_config.materialized_JSON', 'utf-8', (err, data) => {
      // unable to open file, exit
      if (err) {
        res.status(500).send(err.stack);
        return;
      }
      let configNames = [];
      // serialize some example
      let networkConfig = JSON.parse(data);
      if ('topologies' in networkConfig) {
        let topologies = networkConfig['topologies'];
        Object.keys(topologies).forEach(function(key) {
          let topologyConfig = topologies[key];
          let topology = topologyConfig['topology'];
          let configName = topology['name'];
          configNames.push(configName);
        });
      }
      res.json(configNames);
    });
  });
  app.get(/\/topology\/get\/(.+)$/i, function (req, res, next) {
    let reqConfigName = req.params[0];

    var connection = thrift.createConnection('localhost', 9330);
    var client = thrift.createClient(ControllerProxyService, connection);

    connection.on('error', function(err) {
      console.error(err);
      _readTopologyFromFile(reqConfigName, res);
    });

    client.getNetworkState(reqConfigName, function(err, response) {
      if (err) {
        console.error(err);
        _readTopologyFromFile(reqConfigName, res);
      } else {
        res.json(response);
        return;
      }
      res.status(404).end("No such topology\n");
    });
  });

  app.get('^$/', function response(req, res) {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/index.html')));
    res.end();
  });
} else {
  app.use(express.static(__dirname + '/dist'));
  app.get('*', function response(req, res) {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}

app.listen(port, '', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
