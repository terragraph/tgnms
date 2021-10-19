/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {Api} from '../Api';
import {NetworkDto} from '../../shared/dto/api/v1';
import {getNodesAsCSV, getSitesAsKML} from './model';
const {getAllNetworkConfigs} = require('../topology/model');

export default class ExportRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    router.post('/', (req, res) => {
      const configs = getAllNetworkConfigs();
      return res.json(
        Object.keys(configs).map(name => new NetworkDto(configs[name])),
      );
    });

    router.get('/:networkName/sites', async (req, res) => {
      const {networkName} = req.params;
      const kmlString = getSitesAsKML(networkName);
      res.set('Content-Type', 'text/plain');
      if (kmlString !== null) {
        res.send(kmlString);
      } else {
        res.status(500);
        res.send('Error generating KML data');
      }
    });

    router.get('/:networkName/nodes/csv', async (req, res) => {
      const {networkName} = req.params;
      res.set('Content-Type', 'text/plain');
      try {
        const csv = await getNodesAsCSV(networkName);
        if (csv === null) {
          throw new Error('Empty CSV');
        }
        return res.send(csv);
      } catch (err) {
        this.logger.error(err.message);
        res.status(500).end();
      }
    });
    return router;
  }
}
