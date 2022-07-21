/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {Api} from '../../Api';
import {NetworkDto} from '../../../shared/dto/api/v1';
const {
  getAllNetworkConfigs,
  getNetworkConfig,
} = require('../../topology/model');
const fs = require('fs');
import type {ChangelogDto} from '../../../shared/dto/api/v1';
import type {VersionDto} from '../../../shared/dto/api/v1';

export default class ApiV1Routes extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();

    router.get('/networks', (req, res) => {
      const configs = getAllNetworkConfigs();
      return res.json(
        Object.keys(configs).map(name => new NetworkDto(configs[name])),
      );
    });

    router.get('/networks/:name', (req, res) => {
      const {name} = req.params;

      const config = getNetworkConfig(name);
      if (!config) {
        return res.status(404).end();
      }

      return res.json(new NetworkDto(config));
    });

    router.get('/version', (req, res) => {
      const versionResp: VersionDto = {
        version: process.env.npm_package_version || '',
        commit_hash: process.env.COMMIT_HASH || '',
        commit_date: process.env.COMMIT_DATE || '',
        node_env: process.env.NODE_ENV || '',
      };
      return res.json(versionResp);
    });

    router.get('/changelog', (req, res) => {
      fs.readFile('./changelog.json', 'utf-8', (err, data) => {
        if (err) {
          res.status(500).end();
          return;
        }
        const changelog: ChangelogDto = JSON.parse(data);
        res.json(changelog);
      });
    });
    return router;
  }
}
