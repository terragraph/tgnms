/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {STATS_BACKEND} = require('../config');

const express = require('express');
const router = express.Router();

// restrict metric routes based on backend
if (STATS_BACKEND === 'prometheus') {
  router.use('', require('./routes_prometheus'));
} else {
  router.use('', require('./beringei'));
}

module.exports = router;
