/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  API_REQUEST_TIMEOUT,
  SOFTWARE_PORTAL_URL,
  SOFTWARE_PORTAL_API_TOKEN,
  SOFTWARE_PORTAL_API_ID,
  NODEUPDATE_SERVER_URL,
  NODEUPDATE_AUTH_TOKEN,
} = require('../config');
const express = require('express');
const logger = require('../log')(module);
const request = require('request');
const router = express.Router();
import {createErrorHandler, createRequest} from '../helpers/apiHelpers';

export const SUITE_NOT_SPECIFIED_ERROR =
  'error: required parameter suite missing';

router.post('/list', (req, res) => {
  const uri = `${SOFTWARE_PORTAL_URL}${req.url}`;
  const data = {
    ...req.body,
    api_token: SOFTWARE_PORTAL_API_TOKEN,
    api_id: SOFTWARE_PORTAL_API_ID,
  };

  if (req.body.suite == null || req.body.suite === '') {
    return res.status(400).send({message: SUITE_NOT_SPECIFIED_ERROR});
  }

  return createRequest({
    json: data,
    method: 'POST',
    uri,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.use('/', (req, res) => {
  const url = NODEUPDATE_SERVER_URL + req.url;
  const data = {...req.body, auth_token: NODEUPDATE_AUTH_TOKEN};

  request(
    {
      form: data,
      method: req.method,
      timeout: API_REQUEST_TIMEOUT,
      url,
    },
    (err, response, body) => {
      if (err) {
        logger.error('Error connecting to nodeupdate server: %s', err);
        if (err.code === 'ETIMEDOUT') {
          // connection timed out
          res
            .status(500)
            .send({message: 'Connection timed out to nodeupdate server'});
        } else {
          res.status(500).send({message: err.toString()});
        }
        return;
      }
      if (response.statusCode !== 200) {
        logger.error(
          'Received error from nodeupdate server: %d',
          response.statusCode,
        );
        res.status(response.statusCode).end();
      }

      res.status(response.statusCode).send(body);
    },
  );
});

module.exports = router;
