/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import access from '../middleware/access';
import {createApi} from '../helpers/apiHelpers';
import {getSettingsState, testSettings, updateSettings} from './settings';

const router = createApi();
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
