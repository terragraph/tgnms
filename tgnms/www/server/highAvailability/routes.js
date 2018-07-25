/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

const {HAPeerType, getHAState, getPeerAPIServiceHost} = require('./model');
const express = require('express');
const proxy = require('express-http-proxy');

const app = express();

app.get('/:topology/status', (req, res) => {
  const {topology} = req.params;
  res.status(200).send({
    primary: getHAState(topology, HAPeerType.PRIMARY),
    backup: getHAState(topology, HAPeerType.BACKUP),
  });
});

module.exports = app;
