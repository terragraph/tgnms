/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {API_REQUEST_TIMEOUT} = require('../config');
const axios = require('axios');
const express = require('express');
const {getConfigByName} = require('../topology/model');
const {
  getPeerAPIServiceHost,
  HAPeerType,
} = require('../highAvailability/model');
const router = express.Router();

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

router.use('/:topology/:hostref/', (req, res) => {
  const apiAddr = getAPIServiceHost(req, res) + req.url;
  axios
    .request({
      data: req.body,
      method: req.method,
      timeout: API_REQUEST_TIMEOUT,
      url: apiAddr,
    })
    .then(resp => {
      res.status(resp.status).send(resp.data);
    })
    .catch(err => {
      if (err.code === 'ECONNABORTED') {
        // connection timed out
        res.status(500).send({message: 'Connection timed out to API service'});
      } else {
        res
          .status(err.response.status)
          .send({message: err.response.statusText});
      }
    });
});

module.exports = router;
