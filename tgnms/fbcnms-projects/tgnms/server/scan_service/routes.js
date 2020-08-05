/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import axios from 'axios';

const express = require('express');
const {SCANSERVICE_HOST} = require('../config');

const router = express.Router();

router.get('/schedule', (req, res) => {
  return axios({
    method: 'get',
    url: `${SCANSERVICE_HOST}/schedule`,
    params: req.query,
  })
    .then(result => res.status(200).send(result.data.schedules))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.get('/schedule/:scheduleId', (req, res) => {
  const {scheduleId} = req.params;
  return axios({
    method: 'get',
    url: `${SCANSERVICE_HOST}/schedule/${scheduleId}`,
  })
    .then(result => res.status(200).send(result.data))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.post('/schedule', (req, res) => {
  const {cron_expr, type, network_name, mode} = req.body;
  const data = {
    enabled: true,
    cron_expr,
    type,
    network_name,
    mode,
  };
  return axios({
    method: 'post',
    url: `${SCANSERVICE_HOST}/schedule`,
    data,
  })
    .then(result => res.status(200).send(result.data))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.put('/schedule/:scheduleId', (req, res) => {
  const {scheduleId} = req.params;
  const data = req.body;

  return axios({
    method: 'put',
    url: `${SCANSERVICE_HOST}/schedule/${scheduleId}`,
    data,
  })
    .then(result => res.status(200).send(result.data))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.delete('/schedule/:scheduleId', (req, res) => {
  const {scheduleId} = req.params;
  return axios({
    method: 'delete',
    url: `${SCANSERVICE_HOST}/schedule/${scheduleId}`,
  })
    .then(result => res.status(200).send(result.data))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.get('/executions', (req, res) => {
  return axios({
    method: 'get',
    url: `${SCANSERVICE_HOST}/execution`,
    params: req.query,
  })
    .then(result => {
      res.status(200).send(result.data.executions);
    })
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.get('/execution_result/:executionId', (req, res) => {
  const {executionId} = req.params;

  return axios({
    method: 'get',
    url: `${SCANSERVICE_HOST}/execution/${executionId}`,
  })
    .then(result => res.status(200).send(result.data))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

router.post('/start', (req, res) => {
  console.log('in start baby');
  return axios({
    method: 'post',
    url: `${SCANSERVICE_HOST}/execution`,
    data: req.body,
  })
    .then(result => res.status(200).send(result.data))
    .catch(error =>
      res.status(error.response.status).send(error.response.statusMessage),
    );
});

module.exports = router;
