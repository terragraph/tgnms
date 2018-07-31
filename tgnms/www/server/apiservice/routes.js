/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {getConfigByName} = require('../topology/model');
const {
  HAPeerType,
  getPeerAPIServiceHost,
} = require('../highAvailability/model');

const express = require('express');
const isIp = require('is-ip');
const proxy = require('express-http-proxy');

const app = express();

const PROXY_OPTIONS = {
  memoizeHost: false,
};

function getAPIServiceHost(req, res) {
  const topology = getConfigByName(req.params.topology);
  const {hostref} = req.params;

  switch (hostref) {
    case 'primary':
      return getPeerAPIServiceHost(topology, HAPeerType.PRIMARY);
    case 'backup':
      return getPeerAPIServiceHost(topology, HAPeerType.BACKUP);
    case 'default':
    default:
      const peerType =
        topology.controller_ip_active === topology.controller_ip
          ? HAPeerType.PRIMARY
          : HAPeerType.BACKUP;
      return getPeerAPIServiceHost(topology, peerType);
  }
}

app.use('/:topology/:hostref/', proxy(getAPIServiceHost, PROXY_OPTIONS));

module.exports = app;
