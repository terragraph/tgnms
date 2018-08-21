/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

const {DEFAULT_API_SERVICE_PORT, PROXY_ENABLED} = require('../config');
const {
  BinaryStarFsmState,
} = require('../../thrift/gen-nodejs/Controller_types');
const isIp = require('is-ip');

const HAStateByTopology = {};

const HAPeerType = {
  PRIMARY: 'PRIMARY',
  BACKUP: 'BACKUP',
};

function resetTopologyHAState(topology) {
  HAStateByTopology[topology] = {
    [HAPeerType.PRIMARY]: null,
    [HAPeerType.BACKUP]: null,
  };
}

function getHAState(topology, peerType) {
  if (!Object.keys(HAStateByTopology).includes(topology)) {
    return null;
  }
  return HAStateByTopology[topology][peerType];
}

function setHAState(topology, peerType, state) {
  if (
    !Object.keys(HAStateByTopology).includes(topology) ||
    !Object.values(HAPeerType).includes(peerType)
  ) {
    return false;
  }

  HAStateByTopology[topology][peerType] = state;
  return true;
}

function getPeerAPIServiceHost(topologyConfig, peerType) {
  if (!topologyConfig || !Object.values(HAPeerType).includes(peerType)) {
    return null;
  }

  let controllerIp;
  if (peerType === HAPeerType.PRIMARY) {
    if (topologyConfig.apiservice_baseurl) {
      return topologyConfig.apiservice_baseurl;
    }
    controllerIp = topologyConfig.controller_ip;
  } else if (peerType === HAPeerType.BACKUP) {
    if (topologyConfig.apiservice_baseurl_backup) {
      return topologyConfig.apiservice_baseurl_backup;
    }
    controllerIp = topologyConfig.controller_ip_backup;
  }

  if (!controllerIp) {
    return null;
  }

  if (PROXY_ENABLED && isIp.v6(controllerIp)) {
    // special case, proxy doesn't handle ipv6 addresses correctly
    return `http://[[${controllerIp}]]:${DEFAULT_API_SERVICE_PORT}`;
  }
  return isIp.v6(controllerIp)
    ? `http://[${controllerIp}]:${DEFAULT_API_SERVICE_PORT}`
    : `http://${controllerIp}:${DEFAULT_API_SERVICE_PORT}`;
}

function getActiveController(topologyConfig) {
  const {PRIMARY, BACKUP} = HAPeerType;
  const currentState = HAStateByTopology[topologyConfig.name];

  if (currentState[BACKUP] === BinaryStarFsmState.STATE_ACTIVE) {
    // Backup Controller is Active
    return topologyConfig.controller_ip_backup;
  }

  // Otherwise, by default return the primary controller (even if it's offline)
  // since this is only for APIService to know which ip to connect to
  return topologyConfig.controller_ip;
}

module.exports = {
  HAPeerType,
  resetTopologyHAState,
  getHAState,
  setHAState,
  getPeerAPIServiceHost,
  getActiveController,
};
