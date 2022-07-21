/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Api} from '../Api';
import {safePathJoin} from '../helpers/apiHelpers';
const fs = require('fs');
const path = require('path');

export default class SysdumpRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    const SYSDUMP_PATH = path.join(process.cwd(), '/sysdump');
    router.get('/', (req, res) => {
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

    router.get('/download/:filename', (req, res) => {
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

    router.post('/delete', (req, res) => {
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

    router.get('/p/:filename', (req, res) => {
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
    return router;
  }
}
