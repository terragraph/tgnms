/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const express = require('express');
const {getNetworkState} = require('../topology/model');
const {HAPeerType} = require('../high_availability/model');
import apiServiceClient from './apiServiceClient';
const router = express.Router();

function getApiActiveControllerAddress({topology}) {
  const networkState = getNetworkState(topology);
  let controllerConfig = networkState.primary;
  if (
    networkState.hasOwnProperty('active') &&
    networkState.active === HAPeerType.BACKUP
  ) {
    controllerConfig = networkState.backup;
  }
  const {api_ip, api_port} = controllerConfig;
  return {api_ip, api_port};
}

router.use('/:topology/api/:apiMethod', (req, res) => {
  const {topology, apiMethod} = req.params;
  const {api_ip, api_port} = getApiActiveControllerAddress({
    topology,
  });
  const accessToken =
    req.user &&
    typeof req.user.getAccessToken === 'function' &&
    req.user.getAccessToken();
  return apiServiceClient
    .userRequest({
      host: api_ip,
      port: api_port,
      data: req.body,
      apiMethod,
      accessToken,
    })
    .then(response => {
      res.status(response.status).send(response.data);
    })
    .catch(error => {
      if (error.code === 'ECONNABORTED') {
        // connection timed out
        res.status(500).send({message: 'Connection timed out to API service'});
      } else {
        res
          .status(error.response.status)
          .send({message: error.response.statusText});
      }
    });
});

module.exports = router;
