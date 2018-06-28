/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const express = require('express');
const request = require('request');

const app = express();

// proxy requests for OSM to a v6 endpoint
app.get(/^\/tile\/(.+)\/(.+)\/(.+)\/(.+)\.png$/, (req, res, next) => {
  const z = req.params[1];
  const x = req.params[2];
  const y = req.params[3];
  // fetch png
  const tileUrl =
    'http://orm.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
  request(tileUrl).pipe(res);
});

module.exports = app;
