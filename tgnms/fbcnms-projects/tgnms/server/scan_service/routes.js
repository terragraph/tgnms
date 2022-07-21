/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import axios from 'axios';
const {SCANSERVICE_HOST} = require('../config');
import {Api} from '../Api';

export default class MyRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();

    router.get('/schedule', (req, res) => {
      return axios({
        method: 'get',
        url: `${SCANSERVICE_HOST}/schedule`,
        params: req.query,
      })
        .then(result => res.status(200).send(result.data.schedules))
        .catch(error => {
          if (error.response) {
            res
              .status(error.response.status)
              .send(error.response.statusMessage);
          } else {
            res.status(400).send('Scan connection unstable');
          }
        });
    });

    router.get('/schedule/:scheduleId', (req, res) => {
      const {scheduleId} = req.params;
      return axios({
        method: 'get',
        url: `${SCANSERVICE_HOST}/schedule/${scheduleId}`,
      })
        .then(result => res.status(200).send(result.data))
        .catch(error => {
          if (error.response) {
            res
              .status(error.response.status)
              .send(error.response.statusMessage);
          } else {
            res.status(400).send('Scan connection unstable');
          }
        });
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
        .catch(error => {
          if (error.response) {
            res
              .status(error.response.status)
              .send(error.response.statusMessage);
          } else {
            res.status(400).send('Scan connection unstable');
          }
        });
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
    return router;
  }
}
