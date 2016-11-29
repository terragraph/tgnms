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
const thrift = require('thrift');
var Topology_ttypes = require('./thrift/gen-nodejs/Topology_types');
var Controller_ttypes = require('./thrift/gen-nodejs/Controller_types');

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

var fileTopologies = [];
var configs = [];
var topologies_index = 0;
var receivedTopologies = [];

function getTopology(index) {
  let config = configs[index];
  // guard against hanging
  var timeout = setTimeout(function(){
    receivedTopologies[index] = {};
    dealer.close();
  }, 1000);

  let dealer = zmq.socket('dealer');
  dealer.identity = 'NMS_WEB';
  dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
  dealer.connect('tcp://[' + config.controller_ip +']:17077');
  dealer.on('message', function (receiver, senderApp, msg) {
    clearTimeout(timeout);
    // Deserialize Message to get mType
    var tTransport = new thrift.TFramedTransport(msg);
    var tProtocol = new thrift.TCompactProtocol(tTransport);
    var receivedMessage = new Controller_ttypes.Message();
    receivedMessage.read(tProtocol);

    // Deserialize body
    msg = msg.slice(6);
    tTransport = new thrift.TFramedTransport(msg);
    tProtocol = new thrift.TCompactProtocol(tTransport);
    var receivedTopology = new Topology_ttypes.Topology();
    receivedTopology.read(tProtocol);
    receivedTopologies[index] = receivedTopology;
    dealer.close();
  });

  dealer.on('error', function(err) {
    clearTimeout(timeout);
    console.error(err);
    dealer.close();
  });

  var transport = new thrift.TFramedTransport(null, function(byteArray) {
    // Flush puts a 4-byte header, which needs to be parsed/sliced.
     byteArray = byteArray.slice(4);

     dealer.send("", zmq.ZMQ_SNDMORE);
     dealer.send("ctrl-app-TOPOLOGY_APP", zmq.ZMQ_SNDMORE);
     dealer.send("NMS_WEB", zmq.ZMQ_SNDMORE);
     dealer.send(byteArray);
  });

  var tProtocol = new thrift.TCompactProtocol(transport);
  var topologyReqMessage = new Controller_ttypes.Message();
  topologyReqMessage.mType = Controller_ttypes.MessageType.GET_TOPOLOGY;
  topologyReqMessage.value =  '';
  topologyReqMessage.write(tProtocol);
  transport.flush();
}

function periodicNetworkStatus() {
  for (var i = 0, len = configs.length; i < len; i++) {
    getTopology(i);
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
    res.json(configs);
  });

  app.get(/\/topology\/get\/(.+)$/i, function (req, res, next) {
    let topologyName = req.params[0];
    for (var i = 0, len = configs.length; i < len; i++) {
      if(topologyName == configs[i].name) {
        if (receivedTopologies[i] && receivedTopologies[i].name) {
          res.json(receivedTopologies[i]);
        } else {
          res.json(fileTopologies[i]);
        }
        return;
      }
    }
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
