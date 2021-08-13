/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import axios from 'axios';

const express = require('express');
const {TOPOLOGY_HISTORY_HOST} = require('../config');

const router = express.Router();

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

module.exports = router;
