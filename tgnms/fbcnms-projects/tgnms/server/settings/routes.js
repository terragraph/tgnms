/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import access from '../middleware/access';
import {Api} from '../Api';
import {getSettingsState, testSettings, updateSettings} from './settings';

export default class SettingsRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
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
    return router;
  }
}
