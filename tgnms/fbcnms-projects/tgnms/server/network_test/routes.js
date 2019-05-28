/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';
import {ValidationResult} from '../../shared/validation';
const express = require('express');
const request = require('request');
const logger = require('../log')(module);

const {NETWORKTEST_HOST} = require('../config');
const networkTestService = require('./service');

const router = express.Router();

router.get('/options', (req, res) => {
  return createRequest(`${NETWORKTEST_HOST}/api/help/`)
    .then(response => {
      return res.status(response.statusCode).send(response.body);
    })
    .catch(createErrorHandler(res));
});

router.post('/start', (req, res) => {
  return createRequest({
    uri: `${NETWORKTEST_HOST}/api/start_test/`,
    method: 'POST',
    json: req.body,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.post('/stop', (req, res) => {
  return createRequest({
    uri: `${NETWORKTEST_HOST}/api/stop_test/`,
    method: 'POST',
    json: req.body,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.get('/executions', (req, res) => {
  const {network, afterDate, testType, protocol} = req.query;
  return networkTestService
    .getRecentTestExecutions({
      networkName: network,
      afterDate,
      testType,
      protocol,
    })
    .then(executions => res.status(200).send(executions))
    .catch(createErrorHandler(res));
});

router.get('/results', (req, res) => {
  const query = {};
  if (typeof req.query.executionId === 'string') {
    query.executionId = req.query.executionId;
  }
  if (typeof req.query.metrics === 'string') {
    query.metrics =
      req.query.metrics.trim() !== '' ? req.query.metrics.split(',') : [];
  }
  if (typeof req.query.results === 'string') {
    query.results = req.query.results.split(',');
  }
  return networkTestService
    .getTestResults(query)
    .then(results => res.status(200).send(results))
    .catch(createErrorHandler(res));
});

router.get('/executions/:id', (req, res) => {
  return networkTestService
    .getTestExecution({
      executionId: req.params.id,
      includeTestResults: req.query.includeTestResults,
    })
    .then(results => res.status(200).send(results))
    .catch(createErrorHandler(res));
});

router.post('/executions/:id/overlay', (req, res) => {
  return networkTestService
    .getTestOverlay({
      executionId: req.params.id,
      metrics: req.body.metrics,
    })
    .then(results => res.status(200).send(results))
    .catch(createErrorHandler(res));
});

function createRequest(options) {
  const requestOptions = typeof options === 'string' ? {uri: options} : options;
  logger.info(
    `Network test request: ${
      requestOptions.method ? requestOptions.method : 'GET'
    } ${requestOptions.uri}`,
  );
  return new Promise((resolve, reject) => {
    try {
      return request(
        Object.assign({timeout: 2000}, requestOptions),
        (err, response) => {
          if (err) {
            return reject(err);
          }
          return resolve(response);
        },
      );
    } catch (err) {
      return reject(err);
    }
  });
}

function createErrorHandler(res) {
  return error => {
    //only return an error message if it's an expected error
    if (error instanceof ValidationResult || error.expected === true) {
      return res.status(400).send({
        message: error.message,
        ...error,
      });
    }
    logger.error(error);
    return res.status(500).send({});
  };
}

module.exports = router;
