/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {Api} from '../Api';
const fs = require('fs');

export default class DashboardRoutes extends Api {
  dashboards = {};
  async init() {
    this.initLogger(__filename);
    this.dashboards = await new Promise((res, rej) => {
      fs.readFile('./config/dashboards.json', 'utf-8', (err, data) => {
        if (err) {
          return rej(err);
        }
        res(JSON.parse(data));
      });
    });
  }
  makeRoutes() {
    const router = this.createApi();
    router.get(/\/get\/(.+)$/i, (req, res) => {
      const topologyName = req.params[0];
      if (!this.dashboards[topologyName]) {
        this.dashboards[topologyName] = {};
      }
      res.json(this.dashboards[topologyName]);
    });
    router.post(/\/save\/$/i, (req, res) => {
      const data = req.body;
      if (data.topologyName && data.dashboards) {
        this.dashboards[data.topologyName] = data.dashboards;
        fs.writeFile(
          './config/dashboards.json',
          JSON.stringify(this.dashboards, null, 4),
          err => {
            if (err) {
              res.status(500).end('Unable to save');
              this.logger.error('Unable to save: %s', err);
              return;
            }
            res.status(200).end('Saved');
          },
        );
      } else {
        res.status(500).end('Bad Data');
      }
    });

    return router;
  }
}
