/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  addRequester,
  fetchNetworkHealthFromDb,
  getAllNetworkConfigs,
  getNetworkLinkHealth,
  getNetworkNodeHealth,
  getNetworkState,
  reloadInstanceConfig,
  removeRequester,
} = require('./model');
const {LINK_HEALTH_TIME_WINDOW_HOURS, STATS_BACKEND} = require('../config');

const {
  createController,
  createNetwork,
  createWirelessController,
  getNetworkById,
} = require('./network');

const express = require('express');
const logger = require('../log')(module);

const router = express.Router();

router.get(
  '/link_health/:topologyName/:timeWindowHours',
  async (req, res, _next) => {
    const {topologyName} = req.params;
    const timeWindowHours = Number.parseInt(req.params.timeWindowHours);
    let networkLinkHealth = false;
    // use cache if using default interval
    if (timeWindowHours === LINK_HEALTH_TIME_WINDOW_HOURS) {
      networkLinkHealth = getNetworkLinkHealth(topologyName);
    } else if (STATS_BACKEND === 'prometheus') {
      // query for non-default health window
      networkLinkHealth = await fetchNetworkHealthFromDb(
        topologyName,
        timeWindowHours,
      );
    }
    if (networkLinkHealth) {
      res.json(networkLinkHealth);
    } else {
      logger.debug('No link health cache found for %s', topologyName);
      res.status(404).json({msg: 'No cache'});
    }
  },
);

router.get('/node_health/:topologyName', (req, res, _next) => {
  const {topologyName} = req.params;
  const networkNodeHealth = getNetworkNodeHealth(topologyName);
  if (networkNodeHealth) {
    res.json(networkNodeHealth);
  } else {
    logger.debug('No node health cache found for %s', topologyName);
    res.status(404).json({msg: 'No cache'});
  }
});

router.get('/list', (req, res, _next) => {
  res.json(getAllNetworkConfigs());
});

router.post('/update/:networkId', async (req, res, _next) => {
  // Update an existing network
  const {networkId} = req.params;
  const topologyData = req.body;
  try {
    // Fetch network by ID
    const network = await getNetworkById(networkId);

    // Update network name
    if (network.name !== topologyData.name) {
      network.name = topologyData.name;
      await network.save();
    }

    // Update primary controller
    if (network.primary.id) {
      network.primary.api_ip = topologyData.primary.api_ip;
      network.primary.e2e_ip = topologyData.primary.e2e_ip;
      network.primary.api_port = topologyData.primary.api_port;
      network.primary.e2e_port = topologyData.primary.e2e_port;
      await network.primary.save();
    } else {
      const primaryController = createController(
        topologyData.primary.api_ip,
        topologyData.primary.e2e_ip,
        topologyData.primary.api_port,
        topologyData.primary.e2e_port,
      );
      network.primary_controller = primaryController.id;
      await network.save();
    }
    // Update backup controller
    if (network.backup.id) {
      network.backup.api_ip = topologyData.backup.api_ip;
      network.backup.e2e_ip = topologyData.backup.e2e_ip;
      network.backup.api_port = topologyData.backup.api_port;
      network.backup.e2e_port = topologyData.backup.e2e_port;
      await network.backup.save();
    } else {
      const backupController = createController(
        topologyData.backup.api_ip,
        topologyData.backup.e2e_ip,
        topologyData.backup.api_port,
        topologyData.backup.e2e_port,
      );
      network.backup_controller = backupController.id;
      await network.save();
    }

    // Update wireless AP controller
    if (network.wac && network.wac.id) {
      if (topologyData.wireless_controller) {
        network.wac.type = topologyData.wireless_controller.type;
        network.wac.url = topologyData.wireless_controller.url;
        network.wac.username = topologyData.wireless_controller.username;
        if (topologyData.wireless_controller.password) {
          // not passed to front-end, so skip if front-end omits it
          network.wac.password = topologyData.wireless_controller.password;
        }
        await network.wac.save();
      } else {
        await network.wac.destroy();
      }
    } else if (topologyData.wireless_controller) {
      const wirelessController = await createWirelessController(
        topologyData.wireless_controller.type,
        topologyData.wireless_controller.url,
        topologyData.wireless_controller.username,
        topologyData.wireless_controller.password,
      );
      network.wireless_controller = wirelessController.id;
      await network.save();
    }

    await reloadInstanceConfig();
    res.end();
  } catch (err) {
    res.status(500).json({msg: 'Unable to update network'});
  }
});

router.post('/create', async (req, res, _next) => {
  // Create a new network
  const networkConfig = req.body;
  try {
    // basic sanity checks
    if (
      !networkConfig.name ||
      !networkConfig.primary ||
      !networkConfig.primary.api_ip ||
      !networkConfig.primary.e2e_ip
    ) {
      res.status(400).json({msg: 'Unable to create network'});
      return;
    }

    if (!networkConfig.primary) {
      res.status(400).json({msg: 'Missing primary controller data'});
      return;
    }
    const primaryController = await createController(
      networkConfig.primary.api_ip,
      networkConfig.primary.e2e_ip,
      networkConfig.primary.api_port,
      networkConfig.primary.e2e_port,
    );
    const network = await createNetwork(networkConfig.name, primaryController);
    if (networkConfig.backup) {
      const backupController = await createController(
        networkConfig.backup.api_ip,
        networkConfig.backup.e2e_ip,
        networkConfig.backup.api_port,
        networkConfig.backup.e2e_port,
      );
      network.backup_controller = backupController.id;
      await network.save();
    }
    if (networkConfig.wireless_controller) {
      const wirelessController = await createWirelessController(
        networkConfig.wireless_controller.type,
        networkConfig.wireless_controller.url,
        networkConfig.wireless_controller.username,
        networkConfig.wireless_controller.password,
      );
      network.wireless_controller = wirelessController.id;
      await network.save();
    }
    await reloadInstanceConfig();
    res.end();
  } catch (err) {
    res.status(500).json({msg: 'Unable to create network'});
  }
});

router.post('/delete/:networkId', async (req, res, _next) => {
  // Delete a network
  const {networkId} = req.params;
  try {
    const network = await getNetworkById(networkId);
    await network.destroy();
    await reloadInstanceConfig();
    res.end();
  } catch (err) {
    res.status(500).json({msg: 'Unable to delete network'});
  }
});

router.get('/get/:topologyName', (req, res, _next) => {
  const {topologyName} = req.params;
  const networkState = getNetworkState(topologyName);
  if (!networkState) {
    res.status(404).json({msg: 'Topology not found'});
    return;
  }
  res.json(networkState);
});

router.get('/events/:topologyName', (req, res, _next) => {
  const {topologyName} = req.params;
  // make sure it is streaming
  res.header('Content-Type', 'text/event-stream');

  const pusher = setInterval(() => {
    res.write(':heartbeat\n\n');
    res.flush(); // force send even if compression
  }, 20000);

  // remember this browser, so that we can push topology changes later
  logger.info('A new browser is interested in topology ' + topologyName);
  addRequester(topologyName, res);

  req.on('close', () => {
    logger.info('Lost a browser interested in topology ' + topologyName);
    clearInterval(pusher);
    if (!res.finished) {
      res.end();
      removeRequester(res);
    }
  });
});

module.exports = router;
