/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {API_REQUEST_TIMEOUT} = require('../config');
const axios = require('axios');
const express = require('express');
const {formatApiServiceBaseUrl, getNetworkState} = require('../topology/model');
const {HAPeerType} = require('../high_availability/model');
const router = express.Router();

function formatApiActiveControllerAddress(req, _res) {
  const networkState = getNetworkState(req.params.topology);
  let controllerConfig = networkState.primary;
  if (
    networkState.hasOwnProperty('active') &&
    networkState.active === HAPeerType.BACKUP
  ) {
    controllerConfig = networkState.backup;
  }
  const {api_ip, api_port} = controllerConfig;
  return formatApiServiceBaseUrl(api_ip, api_port);
}

router.use('/:topology/', (req, res) => {
  const apiAddr = formatApiActiveControllerAddress(req, res) + req.url;
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
