/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

const {HAPeerType, getHAState} = require('./model');
const express = require('express');

const router = express.Router();

router.get('/:topology/status', (req, res) => {
  const {topology} = req.params;
  res.status(200).send({
    backup: getHAState(topology, HAPeerType.BACKUP),
    primary: getHAState(topology, HAPeerType.PRIMARY),
  });
});

module.exports = router;
