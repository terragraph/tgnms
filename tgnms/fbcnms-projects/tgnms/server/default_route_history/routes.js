/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const express = require('express');
import {createErrorHandler, createRequest} from '../helpers/apiHelpers';
const querystring = require('querystring');

const {DEFAULT_ROUTES_HISTORY_HOST} = require('../config');

const router = express.Router();

router.get('/history', (req, res) => {
  if (DEFAULT_ROUTES_HISTORY_HOST === null) {
    res
      .status(500)
      .send('DEFAULT_ROUTES_HISTORY_HOST is not set in .env')
      .end();
    return;
  }
  const {topologyName, nodeName, startTime, endTime} = req.query;
  if (!topologyName || !nodeName || !startTime || !endTime) {
    return res.status(400).send();
  }
  const uri =
    `${DEFAULT_ROUTES_HISTORY_HOST}/routes/history?topology_name=` +
    `${querystring.escape(topologyName)}&node_name=` +
    `${querystring.escape(nodeName)}&start_time=` +
    `${querystring.escape(startTime)}&end_time=` +
    `${querystring.escape(endTime)}`;
  return createRequest({
    uri: uri,
    method: 'GET',
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

module.exports = router;
