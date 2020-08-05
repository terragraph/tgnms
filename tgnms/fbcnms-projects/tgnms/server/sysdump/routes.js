/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {SYSDUMP_ENDPOINT_URL} from '../config';
import {createRequest} from '../helpers/apiHelpers';

const express = require('express');
const querystring = require('querystring');
const router = express.Router();

router.get('/p/:filename', (req, res, _next) => {
  const {filename} = req.params;
  createRequest({
    uri: `${SYSDUMP_ENDPOINT_URL}/${querystring.escape(filename)}`,
  })
    .then(response => {
      if (response.statusCode === 200) {
        res.status(200).send();
      } else {
        res.status(404).send();
      }
    })
    .catch(() => {
      res.status(500).json({
        msg: `Encountered an error while polling for sysdump: ${filename}`,
      });
    });
});

module.exports = router;
