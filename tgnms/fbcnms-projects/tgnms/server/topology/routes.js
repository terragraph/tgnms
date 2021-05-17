/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
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
const {LINK_HEALTH_TIME_WINDOW_HOURS, IS_KUBERNETES} = require('../config');
const {
  k8s_name,
  createK8sController,
  deleteK8sController,
} = require('../helpers/k8sHelpers');
const {
  createController,
  createNetwork,
  createWirelessController,
  getNetworkById,
} = require('./network');
const express = require('express');
const logger = require('../log')(module);
const router = express.Router<Request, Response>();

import type {NetworkInstanceConfig} from '../../shared/dto/NetworkState';
import type {Request, Response} from '../types/express';
import type {Topology} from '../models/topology';

router.get(
  '/link_health/:topologyName/:timeWindowHours?',
  async (req: Request, res: Response, _next) => {
    const {topologyName} = req.params;
    const timeWindowHours = Number.parseInt(req.params.timeWindowHours);
    let networkLinkHealth = false;
    // use cache if using default interval
    if (
      timeWindowHours === LINK_HEALTH_TIME_WINDOW_HOURS ||
      isNaN(timeWindowHours)
    ) {
      networkLinkHealth = getNetworkLinkHealth(topologyName);
    } else {
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

router.get(
  '/node_health/:topologyName',
  (req: Request, res: Response, _next) => {
    const {topologyName} = req.params;
    const networkNodeHealth = getNetworkNodeHealth(topologyName);
    if (networkNodeHealth) {
      res.json(networkNodeHealth);
    } else {
      logger.debug('No node health cache found for %s', topologyName);
      res.status(404).json({msg: 'No cache'});
    }
  },
);

router.get('/list', (req: Request, res: Response, _next) => {
  res.json(getAllNetworkConfigs());
});

router.post(
  '/update/:networkId',
  async (req: Request, res: Response, _next) => {
    // Update an existing network
    const {networkId} = req.params;
    const topologyData: $Shape<NetworkInstanceConfig> = req.body;
    try {
      // Fetch network by ID
      const network: ?Topology = await getNetworkById(networkId);
      if (!network) {
        return null;
      }
      // Update network name
      if (network.name !== topologyData.name) {
        network.name = topologyData.name;
        await network.save();
      }
      network.prometheus_url = topologyData.prometheus_url;
      network.queryservice_url = topologyData.queryservice_url;
      network.alertmanager_url = topologyData.alertmanager_url;
      network.alertmanager_config_url = topologyData.alertmanager_config_url;
      network.prometheus_config_url = topologyData.prometheus_config_url;
      network.event_alarm_url = topologyData.event_alarm_url;
      await network.save();
      // Update primary controller
      if (network.primary.id) {
        network.primary.api_ip = topologyData.primary.api_ip;
        network.primary.e2e_ip = topologyData.primary.e2e_ip;
        network.primary.api_port = topologyData.primary.api_port;
        network.primary.e2e_port = topologyData.primary.e2e_port;
        await network.primary.save();
      } else {
        const primaryController = await createController(
          topologyData.primary.api_ip,
          topologyData.primary.e2e_ip,
          topologyData.primary.api_port,
          topologyData.primary.e2e_port,
        );
        network.primary_controller = primaryController.id;
        await network.save();
      }
      const backupTopology = topologyData.backup ?? {
        api_ip: '',
        e2e_ip: '',
        api_port: 0,
        e2e_port: 0,
      };
      // Update backup controller
      if (network.backup?.id) {
        network.backup.api_ip = backupTopology.api_ip;
        network.backup.e2e_ip = backupTopology.e2e_ip;
        network.backup.api_port = backupTopology.api_port;
        network.backup.e2e_port = backupTopology.e2e_port;
        await network.backup.save();
      } else {
        const backupController = await createController(
          backupTopology.api_ip,
          backupTopology.e2e_ip,
          backupTopology.api_port,
          backupTopology.e2e_port,
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
      } else if (
        topologyData.wireless_controller &&
        topologyData.wireless_controller?.password != null
      ) {
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
      logger.error(err);
      res.status(500).json({msg: 'Unable to update network'});
    }
  },
);

router.post('/create', async (req: Request, res: Response, _next) => {
  // Create a new network
  const networkConfig: $Shape<NetworkInstanceConfig> = req.body;
  try {
    // basic sanity checks
    if (IS_KUBERNETES) {
      if (!networkConfig.name) {
        res.status(400).json({msg: 'Unable to create network (missing name)'});
        return;
      }
      logger.info(
        `Kubernetes environment detected, ignoring all networkConfig options except name ${networkConfig.name}`,
      );
      try {
        createK8sController(networkConfig.name);
      } catch (err) {
        logger.error(err);
        res.status(500).json({msg: 'Failed to start controller pods'});
      }
      networkConfig.primary = {
        api_ip: `e2e-${k8s_name(networkConfig.name)}`,
        e2e_ip: `e2e-${k8s_name(networkConfig.name)}`,
        api_port: 8080,
        e2e_port: 17707,
      };
    }

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
    network.prometheus_url = networkConfig.prometheus_url;
    network.queryservice_url = networkConfig.queryservice_url;
    network.alertmanager_url = networkConfig.alertmanager_url;
    network.alertmanager_config_url = networkConfig.alertmanager_config_url;
    network.prometheus_config_url = networkConfig.prometheus_config_url;
    network.event_alarm_url = networkConfig.event_alarm_url;
    await network.save();
    if (networkConfig.backup) {
      const backupController = await createController(
        networkConfig.backup.api_ip,
        networkConfig.backup.e2e_ip ?? '',
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
        networkConfig.wireless_controller?.password ?? '',
      );
      network.wireless_controller = wirelessController.id;
      await network.save();
    }
    await reloadInstanceConfig();
    res.end();
  } catch (err) {
    logger.error(err);
    res.status(500).json({msg: 'Unable to create network'});
  }
});

router.post(
  '/delete/:networkId',
  async (req: Request, res: Response, _next) => {
    // Delete a network
    const {networkId} = req.params;
    try {
      const network = await getNetworkById(networkId);
      if (network) {
        if (IS_KUBERNETES) {
          try {
            deleteK8sController(network.name);
          } catch (err) {
            logger.error(err);
            res.status(500).json({msg: 'Failed to remove controller pods'});
          }
        }
        await network.destroy();
      }
      await reloadInstanceConfig();
      res.end();
    } catch (err) {
      res.status(500).json({msg: 'Unable to delete network'});
    }
  },
);

router.get('/get/:topologyName', (req: Request, res: Response, _next) => {
  const {topologyName} = req.params;
  const networkState = getNetworkState(topologyName);
  if (!networkState) {
    res.status(404).json({msg: 'Topology not found'});
    return;
  }
  res.json(networkState);
});

router.get('/events/:topologyName', (req: Request, res: Response, _next) => {
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
