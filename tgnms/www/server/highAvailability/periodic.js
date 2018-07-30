/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

const {schedule} = require('../scheduler');
const {
  HAPeerType,
  getHAState,
  setHAState,
  getPeerAPIServiceHost,
  getActiveController,
} = require('./model');
const {getAllTopologyNames, getConfigByName} = require('../topology/model');

const axios = require('axios');
const isIp = require('is-ip');
const logger = require('../log')(module);

const DEFAULT_HIGH_AVAILABILITY_REFRESH_INTERVAL = 5 * 1000;

function updatePeerStatus(topologyConfig, peerType) {
  const host = getPeerAPIServiceHost(topologyConfig, peerType);
  const topologyName = topologyConfig.name;

  if (host) {
    axios
      .post(`${host}/api/getHighAvailabilityState`, {})
      .then(response => {
        const {data} = response;
        logger.debug(
          '[%s] Got %s Controller State: %s',
          topologyName,
          peerType,
          data.state,
        );
        setHAState(topologyName, peerType, data.state);
      })
      .catch(error => {
        logger.error(
          '[%s] %s Controller Error: %s',
          topologyName,
          peerType,
          error.message,
        );
        setHAState(topologyName, peerType, null);
      });
  } else {
    logger.debug(
      '[%s] No APIService Host found for %s',
      topologyName,
      peerType,
    );
  }
}

function updateHighAvailabilityStatus(topologyConfig) {
  const topologyName = topologyConfig.name;
  updatePeerStatus(topologyConfig, HAPeerType.PRIMARY);
  updatePeerStatus(topologyConfig, HAPeerType.BACKUP);

  // Update the config's high availability parameters
  const primaryState = getHAState(topologyName, HAPeerType.PRIMARY);
  const backupState = getHAState(topologyName, HAPeerType.BACKUP);
  topologyConfig.haState = {
    primary: primaryState,
    backup: backupState,
  };
  // If HAState is 0, it means HA is disabled, therefore default
  // controller_ip_active to the primary controller ip
  topologyConfig.controller_ip_active =
    primaryState === 0
      ? topologyConfig.controller_ip
      : getActiveController(topologyConfig);
}

function startPeriodicTasks() {
  logger.debug('periodic: starting high availability tasks...');

  const topologies = getAllTopologyNames();
  topologies.forEach(topologyName => {
    logger.debug(
      'periodic: refreshing high availability status for %s',
      topologyName,
    );
    schedule(
      () => updateHighAvailabilityStatus(getConfigByName(topologyName)),
      DEFAULT_HIGH_AVAILABILITY_REFRESH_INTERVAL,
    );
  });
}

module.exports = {
  updateHighAvailabilityStatus,
  startPeriodicTasks,
};
