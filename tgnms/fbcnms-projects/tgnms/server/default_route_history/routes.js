/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {ExpressRequest, ExpressResponse} from 'express';
const express = require('express');
import {createErrorHandler, createRequest} from '../helpers/apiHelpers';
const querystring = require('querystring');

const {DEFAULT_ROUTES_HISTORY_HOST} = require('../config');

const router: express.Router<
  ExpressRequest,
  ExpressResponse,
> = express.Router();

router.get('/history', (req, res) => {
  if (DEFAULT_ROUTES_HISTORY_HOST === null) {
    res
      .status(500)
      .send('DEFAULT_ROUTES_HISTORY_HOST is not set in .env')
      .end();
    return;
  }
  const {networkName, nodeName, startTime, endTime} = req.query;
  if (!networkName || !nodeName || !startTime || !endTime) {
    return res.status(400).send();
  }
  const uri = `${DEFAULT_ROUTES_HISTORY_HOST}/routes/history?${querystring.stringify(
    {
      network_name: networkName,
      node_name: nodeName,
      start_dt: startTime,
      end_dt: endTime,
    },
  )}`;
  return createRequest({
    uri: uri,
    method: 'GET',
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

module.exports = router;
