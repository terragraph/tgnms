/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
} = require('../config');
const {
  getAllTopologyNames,
  getNetworkLinkHealth,
  getNetworkNodeHealth,
  getTopologyByName,
} = require('./model');
const express = require('express');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const logger = require('../log')(module);

const router = express.Router();

router.get(/\/link_health\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  const networkLinkHealth = getNetworkLinkHealth(topologyName);
  if (networkLinkHealth) {
    res.send(networkLinkHealth).end();
  } else {
    logger.debug('No cache found for %s', topologyName);
    res.send('No cache').end();
  }
});

router.get(/\/node_health\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  const networkNodeHealth = getNetworkNodeHealth(topologyName);
  if (networkNodeHealth) {
    res.send(networkNodeHealth).end();
  } else {
    logger.debug('No cache found for %s', topologyName);
    res.send('No cache').end();
  }
});

router.get(/\/list$/, (req, res, next) => {
  res.json(getAllTopologyNames().map(keyName => getTopologyByName(keyName)));
});

router.get(/\/get\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  const topology = getTopologyByName(topologyName);

  if (Object.keys(topology).length > 0) {
    res.json(topology);
    return;
  }
  res.status(404).end('No such topology\n');
});

router.get(/\/get_stateless\/(.+)$/i, (req, res, next) => {
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

router.post(/\/config\/save$/i, (req, res, next) => {
  const configData = req.body;
  if (configData && configData.topologies) {
    configData.topologies.forEach(config => {
      // if the topology file doesn't exist, write it
      // TODO - sanitize file name (serious)
      const topologyFile = path.join(
        NETWORK_CONFIG_NETWORKS_PATH,
        config.topology_file,
      );
      if (config.topology && !fs.existsSync(topologyFile)) {
        logger.debug(
          'Missing topology file for %s writing to %s',
          config.topology.name,
          topologyFile,
        );
        fs.writeFile(
          topologyFile,
          JSON.stringify(config.topology, null, 4),
          err => {
            logger.error(
              'Unable to write topology file %s, error: %s',
              topologyFile,
              err,
            );
          },
        );
      }
      // ensure we don't write the e2e topology to the instance config
      delete config.topology;
    });
  }

  // update mysql time series db
  const liveConfigFile = NETWORK_CONFIG_PATH;
  fs.writeFile(liveConfigFile, JSON.stringify(configData, null, 4), err => {
    if (err) {
      res.status(500).end('Unable to save');
      logger.error('Unable to save: %s', err);
      return;
    }
    res.status(200).end('Saved');
    logger.debug('Saved instance config %s', NETWORK_CONFIG_PATH);
  });
});

module.exports = router;
