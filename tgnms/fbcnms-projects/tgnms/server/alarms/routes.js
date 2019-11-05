/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
import {
  ALERTMANAGER_CONFIG_PORT,
  ALERTMANAGER_HOST,
  ALERTMANAGER_PORT,
  PROMETHEUS_CONFIG_HOST,
  PROM_ALERTCONFIG_PORT,
  TG_ALARM_HOST,
  TG_ALARM_PORT,
} from '../config';

import {createErrorHandler, createRequest} from '../helpers/apiHelpers';
const express = require('express');
const isIp = require('is-ip');
const {queryLatest} = require('../metrics/prometheus');
const _ = require('lodash');

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
    uri: formatPrometheusAlertConfigUrl(`/0/alert`),
    method: req.method,
    json: req.body,
  };
  return createRequest(params)
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.get('/alert_config', (req, res) => {
  const params = {
    uri: formatPrometheusAlertConfigUrl(`/0/alert`),
    method: req.method,
    qs: req.query,
  };
  return createRequest(params)
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res));
});

router.get('/receivers', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/0/receiver`),
    method: req.method,
    qs: req.query,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.get('/routes', (req, res) =>
  createRequest({
    uri: formatAlertManagerConfigUrl(`/0/receiver/route`),
    method: req.method,
    qs: req.query,
  })
    .then(response =>
      res.status(response.statusCode).send(JSON.parse(response.body)?.routes),
    )
    .catch(createErrorHandler(res)),
);

router.get('/tg_rules', (req, res) =>
  createRequest({
    uri: formatTgAlarmServiceUrl(`/rules`),
    method: req.method,
    //json: req.body,
  })
    .then(response => res.status(response.statusCode).send(response.body))
    .catch(createErrorHandler(res)),
);

router.post('/tg_rule_add', (req, res) =>
  createRequest({
    uri: formatTgAlarmServiceUrl(`/add_rule`),
    method: req.method,
    qs: req.query,
  })
    .then(response => res.status(response.statusCode).send(response.body))
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

function formatAlertManagerConfigUrl(uri) {
  const urlBase = formatUrl(PROMETHEUS_CONFIG_HOST, ALERTMANAGER_CONFIG_PORT);
  return `${urlBase}${uri}`;
}

function formatPrometheusAlertConfigUrl(uri) {
  const urlBase = formatUrl(PROMETHEUS_CONFIG_HOST, PROM_ALERTCONFIG_PORT);
  return `${urlBase}${uri}`;
}

function formatAlertManagerUrl(uri) {
  const urlBase = formatUrl(ALERTMANAGER_HOST, ALERTMANAGER_PORT);
  return `${urlBase}${uri}`;
}

function formatTgAlarmServiceUrl(uri) {
  const urlBase = formatUrl(TG_ALARM_HOST, TG_ALARM_PORT);
  return `${urlBase}${uri}`;
}

function formatUrl(host: string, port: ?number) {
  const url = isIp.v6(host) ? `http://[${host}]` : `http://${host}`;
  if (typeof port === 'number') {
    return url + `:${port}`;
  }
  return url;
}

module.exports = router;
