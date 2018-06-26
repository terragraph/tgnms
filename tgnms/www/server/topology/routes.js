const {
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
} = require('../config');
const {
  getAllTopologyNames,
  getNetworkHealth,
  getTopologyByName,
} = require('./model');
const express = require('express');
const fs = require('fs');
const querystring = require('querystring');

const app = express();

app.get(/\/health\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const networkHealth = getNetworkHealth(topologyName);
  if (networkHealth) {
    res.send(networkHealth).end();
  } else {
    console.log('No cache found for', topologyName);
    res.send('No cache').end();
  }
});

app.get(/\/list$/, function (req, res, next) {
  res.json(
    getAllTopologyNames().map(keyName => getTopologyByName(keyName)),
  );
});

app.get(/\/get\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const topology = getTopologyByName(topologyName);

  if (Object.keys(topology).length > 0) {
    res.json(topology);
    return;
  }
  res.status(404).end('No such topology\n');
});

app.get(/\/get_stateless\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const networkConfig = Object.assign({}, getTopologyByName(topologyName));
  const topology = networkConfig.topology;
  if (topology) {
    // when config is downloaded we shouldn't show any status
    // injected by the running e2e controller
    if (topology.links) {
      topology.links.forEach(link => {
        delete link.linkup_attempts;
        link.is_alive = false;
      });
    }
    if (topology.nodes) {
      topology.nodes.forEach(node => {
        delete node.status_dump;
        // add missing parameters?
        if (!node.hasOwnProperty('ant_azimuth')) {
          node.ant_azimuth = 0;
        }
        if (!node.hasOwnProperty('ant_elevation')) {
          node.ant_elevation = 0;
        }
        node.status = 1;
        // delete node['polarity'];
      });
    }
    res.json(networkConfig);
    return;
  }
  res.status(404).end('No such topology\n');
});

app.post(/\/config\/save$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function (chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function () {
    if (!httpPostData.length) {
      return;
    }
    const configData = JSON.parse(httpPostData);
    if (configData && configData.topologies) {
      configData.topologies.forEach(config => {
        // if the topology file doesn't exist, write it
        // TODO - sanitize file name (serious)
        const topologyFile = path.join(
          NETWORK_CONFIG_NETWORKS_PATH,
          config.topology_file,
        );
        if (config.topology && !fs.existsSync(topologyFile)) {
          console.log(
            'Missing topology file for',
            config.topology.name,
            'writing to',
            topologyFile
          );
          fs.writeFile(
            topologyFile,
            JSON.stringify(config.topology, null, 4),
            function (err) {
              console.error(
                'Unable to write topology file',
                topologyFile,
                'error:',
                err
              );
            }
          );
        }
        // ensure we don't write the e2e topology to the instance config
        delete config.topology;
      });
    }

    // update mysql time series db
    const liveConfigFile = NETWORK_CONFIG_PATH;
    fs.writeFile(liveConfigFile, JSON.stringify(configData, null, 4), function (
      err
    ) {
      if (err) {
        res.status(500).end('Unable to save');
        console.log('Unable to save', err);
        return;
      }
      res.status(200).end('Saved');
      console.log('Saved instance config', NETWORK_CONFIG_PATH);
    });
  });
});

module.exports = app;
