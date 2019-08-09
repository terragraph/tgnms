/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const express = require('express');
const request = require('request');
const logger = require('../log')(module);
import {createErrorHandler} from '../helpers/apiHelpers';

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

router.get('/schedule/:networkName', (req, res) => {
  const {networkName} = req.params;
  return networkTestService
    .getTestSchedule({
      networkName,
    })
    .then(results => res.status(200).send(results))
    .catch(createErrorHandler(res));
});

// test schedule api uses op codes for the modify_sched api
const TEST_SCHEDULE_INSTRUCTIONS = {
  DELETE: 100,
  SUSPEND: 200,
  ENABLE: 300,
};

router.delete('/schedule/:scheduleId', (req, res) => {
  const {scheduleId} = req.params;

  return createRequest({
    uri: `${NETWORKTEST_HOST}/api/modify_sched/`,
    method: 'POST',
    json: {
      instruction: {
        value: TEST_SCHEDULE_INSTRUCTIONS.DELETE,
      },
      test_schedule_id: scheduleId,
    },
  })
    .then(response => res.status(response.statusCode).send(response.body))
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

module.exports = router;
