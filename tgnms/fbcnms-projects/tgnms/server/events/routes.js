/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {BERINGEI_QUERY_URL} = require('../config');

const express = require('express');
const request = require('request');
const router = express.Router();

router.post('/query', (req, res) => {
  const eventUrl = BERINGEI_QUERY_URL + '/events_query';

  request.post(
    {
      body: JSON.stringify(req.body),
      url: eventUrl,
    },
    (err, httpResponse, _body) => {
      if (err) {
        res
          .status(500)
          .send('Error fetching from beringei: ' + err)
          .end();
        return;
      }
      try {
        const parsed = JSON.parse(httpResponse.body);
        res.send(parsed).end();
      } catch (ex) {
        console.error('Failed to parse event json:', httpResponse.body);
        return;
      }
    },
  );
});

module.exports = router;
