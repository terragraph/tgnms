/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const express = require('express');
const router = express.Router();

router.use('', require('./routes_prometheus'));

module.exports = router;
