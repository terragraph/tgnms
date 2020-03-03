/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
import {
  ALERTMANAGER_CONFIG_URL,
  ALERTMANAGER_URL,
  PROMETHEUS_CONFIG_URL,
  TG_ALARM_URL,
} from '../config';

import {createErrorHandler, createRequest} from '../helpers/apiHelpers';
const express = require('express');
const {queryLatest} = require('../metrics/prometheus');

const router = express.Router();

router.get('/alerts', (req, res) =>
  createRequest({
    uri: formatAlertManagerUrl(`/api/v1/alerts`),
    method: req.method,
  })
    .then(response =>
      res.status(response.statusCode).send(JSON.parse(response.body)?.data),
    )
    .catch(createErrorHandler(res)),
);

router.get('/silences', (req, res) =>
  createRequest({
    uri: formatAlertManagerUrl(`/api/v1/silences`),
    method: req.method,
  })
    .then(response =>
      res.status(response.statusCode).send(JSON.parse(response.body)?.data),
    )
    .catch(createErrorHandler(res)),
);

router.post('/alert_config', (req, res) => {
  const params = {
    uri: formatPrometheusConfigUrl(`/alert`),
    method: req.method,
    json: req.body,
  };
  return createRequest(params)
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.put('/alert_config/:alertName', (req, res) => {
  const {alertName} = req.params;
  if (!alertName) {
    return res.status(400).json({error: 'invalid alertName'});
  }
  const params = {
    uri: formatPrometheusConfigUrl(`/alert/${alertName}`),
    method: req.method,
    json: req.body,
  };
  return createRequest(params)
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.delete('/alert_config/:alertName', (req, res) => {
  const params = {
    uri: formatPrometheusConfigUrl(`/alert/${req.params.alertName}`),
    method: req.method,
    qs: req.query,
  };
  return createRequest(params)
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.get('/alert_config', (req, res) => {
  const params = {
    uri: formatPrometheusConfigUrl(`/alert`),
    method: req.method,
    qs: req.query,
  };
  return createRequest(params)
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.get('/receivers', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/receiver`),
    method: req.method,
    qs: req.query,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);
router.post('/receivers', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/receiver`),
    method: req.method,
    json: req.body,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.put('/receivers/:name', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/receiver/${req.params.name}`),
    method: req.method,
    json: req.body,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.delete('/receivers/:name', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/receiver`),
    method: req.method,
    qs: {receiver: req.params.name},
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.get('/routes', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/route`),
    method: req.method,
    qs: req.query,
  })
    .then(response => {
      return res.status(response.statusCode).send(response.body);
    })
    .catch(createErrorHandler(res)),
);

router.post('/routes', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/route`),
    method: req.method,
    json: req.body,
  })
    .then(response => {
      return res.status(response.statusCode).send(response.body);
    })
    .catch(createErrorHandler(res)),
);

router.get('/tg_rules', (req, res) =>
  createRequest({
    uri: formatTgAlarmServiceUrl(`/rules`),
    method: req.method,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.post('/tg_rule_add', (req, res) =>
  createRequest({
    uri: formatTgAlarmServiceUrl(`/add_rule`),
    method: req.method,
    json: req.body,
  })
    .then(response => {
      return res.status(response.statusCode).send(response.body);
    })
    .catch(createErrorHandler(res)),
);

router.post('/tg_rule_del', (req, res) =>
  createRequest({
    uri: formatTgAlarmServiceUrl(`/del_rule`),
    method: req.method,
    qs: req.query,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

// matching alerts (count only)
router.get('/matching_alerts/:alertExpr', (req, res) => {
  queryLatest({query: `count(${req.params.alertExpr})`})
    .then(response => res.status(200).send(response))
    .catch(createErrorHandler(res));
});

router.post('/globalconfig', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl('/global'),
    method: req.method,
    json: req.body,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.get('/globalconfig', (req, res) => {
  return createRequest({
    uri: formatAlertManagerConfigUrl('/global'),
    method: req.method,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

function formatAlertManagerConfigUrl(uri) {
  return `${ALERTMANAGER_CONFIG_URL}/v1/tg${uri}`;
}

function formatPrometheusConfigUrl(uri) {
  return `${PROMETHEUS_CONFIG_URL}/v1/tg${uri}`;
}

function formatAlertManagerUrl(uri) {
  return `${ALERTMANAGER_URL}${uri}`;
}

function formatTgAlarmServiceUrl(uri) {
  return `${TG_ALARM_URL}${uri}`;
}

module.exports = router;
