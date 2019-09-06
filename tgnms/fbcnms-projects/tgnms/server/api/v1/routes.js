/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {
  getAllNetworkConfigs,
  getNetworkConfig,
} = require('../../topology/model');

import {NetworkDto} from '../../../shared/dto/api/v1';

const express = require('express');

const router = express.Router();

router.get('/network', (req, res) => {
  const configs = getAllNetworkConfigs();
  return res.json(
    Object.keys(configs).map(name => new NetworkDto(configs[name])),
  );
});

router.get('/network/:name', (req, res) => {
  const {name} = req.params;

  const config = getNetworkConfig(name);
  if (!config) {
    return res.status(404).end();
  }

  return res.json(new NetworkDto(config));
});

module.exports = router;
