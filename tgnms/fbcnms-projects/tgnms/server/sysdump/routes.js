/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {safePathJoin} from '../helpers/apiHelpers';

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const SYSDUMP_PATH = path.join(process.cwd(), '/sysdump');

router.get('/', (req, res, _next) => {
  try {
    const sysdumps = fs.readdirSync(SYSDUMP_PATH).map(filename => {
      const stats = fs.statSync(path.join(SYSDUMP_PATH, filename));
      return {
        filename,
        date: stats.birthtime,
        size: stats.size,
      };
    });
    res.status(200).json(sysdumps);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get('/download/:filename', (req, res, _next) => {
  const {filename} = req.params;
  const path = safePathJoin(SYSDUMP_PATH, filename);
  try {
    if (fs.existsSync(path)) {
      res.download(path);
    } else {
      res.status(404).send();
    }
  } catch (err) {
    res.status(500).send();
  }
});

router.post('/delete', (req, res, _next) => {
  const failedDelete = [];
  const deleted = [];
  req.body.sysdumps.forEach(filename => {
    const path = safePathJoin(SYSDUMP_PATH, filename);
    try {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
        deleted.push(filename);
      }
    } catch (err) {
      failedDelete.push(filename);
    }
  });
  res.status(200).json({
    deleted,
    failedDelete,
  });
});

router.get('/p/:filename', (req, res, _next) => {
  const {filename} = req.params;
  const path = safePathJoin(SYSDUMP_PATH, filename);
  try {
    if (fs.existsSync(path)) {
      res.status(200).send();
    } else {
      res.status(202).send();
    }
  } catch (err) {
    res.status(500).send();
  }
});

module.exports = router;
