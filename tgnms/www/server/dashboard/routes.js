/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const express = require('express');
const fs = require('fs');

const app = express();

let dashboards = {};
fs.readFile('./config/dashboards.json', 'utf-8', (err, data) => {
  if (!err) {
    dashboards = JSON.parse(data);
  }
});

app.get(/\/get\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  if (!dashboards[topologyName]) {
    dashboards[topologyName] = {};
  }
  res.json(dashboards[topologyName]);
});

app.post(/\/save\/$/i, (req, res, next) => {
  let httpPostData = '';
  req.on('data', chunk => {
    httpPostData += chunk.toString();
  });
  req.on('end', () => {
    if (!httpPostData.length) {
      return;
    }
    const data = JSON.parse(httpPostData);
    if (data.topologyName && data.dashboards) {
      dashboards[data.topologyName] = data.dashboards;
      fs.writeFile(
        './config/dashboards.json',
        JSON.stringify(dashboards, null, 4),
        err => {
          if (err) {
            res.status(500).end('Unable to save');
            console.log('Unable to save', err);
            return;
          }
          res.status(200).end('Saved');
        },
      );
    } else {
      res.status(500).end('Bad Data');
    }
  });
});

module.exports = app;
