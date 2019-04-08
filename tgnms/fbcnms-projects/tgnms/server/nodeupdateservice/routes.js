/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  API_REQUEST_TIMEOUT,
  NODEUPDATE_SERVER_URL,
  NODEUPDATE_AUTH_TOKEN,
} = require('../config');
const express = require('express');
const logger = require('../log')(module);
const request = require('request');
const router = express.Router();

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
