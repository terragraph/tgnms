/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {getSitesAsKML} from './model';
const express = require('express');
const router = express.Router();

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

module.exports = router;
