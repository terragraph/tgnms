/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import axios from 'axios';
import {Api} from '../Api';
const {TOPOLOGY_HISTORY_HOST} = require('../config');

export default class MyRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    router.get('/topology', (req, res) => {
      return axios({
        method: 'get',
        url: `${TOPOLOGY_HISTORY_HOST}/topology`,
        params: req.query,
      })
        .then(result => res.status(200).send(result.data.topologies))
        .catch(error => {
          if (error.response === undefined) {
            return res.status(500).send('Response undefined');
          }
          return res
            .status(error.response.status)
            .send(error.response.statusMessage);
        });
    });
    return router;
  }
}
