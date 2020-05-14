/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {getNodesAsCSV, getSitesAsKML} from './model';
const express = require('express');
const router = express.Router();
const logger = require('../log')(module);

router.get('/:networkName/sites', async (req, res, _next) => {
  const {networkName} = req.params;
  const kmlString = getSitesAsKML(networkName);
  res.set('Content-Type', 'text/plain');
  if (kmlString !== null) {
    res.send(kmlString);
  } else {
    res.status(500);
    res.send('Error generating KML data');
  }
});

router.get('/:networkName/nodes/csv', async (req, res, _next) => {
  const {networkName} = req.params;
  res.set('Content-Type', 'text/plain');
  try {
    const csv = await getNodesAsCSV(networkName);
    if (csv === null) {
      throw new Error('Empty CSV');
    }
    return res.send(csv);
  } catch (err) {
    logger.error(err.message);
    res.status(500).end();
  }
});

module.exports = router;
