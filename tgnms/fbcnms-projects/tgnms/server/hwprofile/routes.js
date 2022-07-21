/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as hwprofile from './hwprofile';
import {Api} from '../Api';
import type {HardwareProfiles} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';

export default class HwProfiles extends Api {
  profiles: ?HardwareProfiles;
  async init() {
    this.initLogger(__filename);
    this.profiles = await this.loadProfiles();
  }
  async loadProfiles(): Promise<?HardwareProfiles> {
    try {
      const map: HardwareProfiles = {};
      for (const p of await hwprofile.loadProfiles()) {
        map[p.hwBoardId] = p;
      }
      return map;
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }
  makeRoutes() {
    return (
      this.createApi()
        // get all profiles
        .get('', async (req, res) => {
          try {
            if (this.profiles == null) {
              return res
                .status(500)
                .json({error: 'Missing env-var: HW_PROFILES_BASE_DIR'});
            }
            return res.json(this.profiles);
          } catch (err) {
            return res.status(500).json({error: err.message});
          }
        })
        .get('/schema', (req, res) => {
          try {
            const schema = hwprofile.getSchema();
            return res.json(schema);
          } catch (err) {
            return res.status(500).json({error: err.message});
          }
        })
    );
  }
}
