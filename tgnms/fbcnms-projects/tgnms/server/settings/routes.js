/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const express = require('express');
// $FlowFixMe: Found when updating to flow 0.125.1
const router = express.Router();
import access from '../middleware/access';
import {getSettingsState, testSettings, updateSettings} from './settings';

router.use(access(['NMS_CONFIG_WRITE']));
router.get('/', (req, res) => {
  return res.json(getSettingsState());
});
router.post('/', (req, res) => {
  return res.json(updateSettings(req.body));
});
router.post('/test', (req, res) => {
  return testSettings(req.body).then(result => res.json(result));
});
module.exports = router;
