/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {Api} from '../Api';
const {createController, createNetwork} = require('../topology/network');
const {reloadInstanceConfig} = require('../topology/model');
const multer = require('multer');

export default class ImportRoutes extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    const upload = multer({storage: multer.memoryStorage()});
    router.post('/', upload.single('file'), async (req, res) => {
      const networkConfigs = JSON.parse(req.file.buffer);
      const valid = [];
      const errors = [];

      networkConfigs.forEach(config => {
        if (
          !config.name ||
          !config.primary ||
          !config.primary.api_ip ||
          !config.primary.e2e_ip
        ) {
          errors.push(config.name);
        } else {
          valid.push(config);
        }
      });

      const success = [];
      await Promise.all(
        valid.map(async config => {
          try {
            const primaryController = await createController(
              config.primary.api_ip,
              config.primary.e2e_ip,
              config.primary.api_port,
              config.primary.e2e_port,
            );
            const network = await createNetwork(config.name, primaryController);
            if (config.backup) {
              const backupController = await createController(
                config.backup.api_ip,
                config.backup.e2e_ip,
                config.backup.api_port,
                config.backup.e2e_port,
              );
              network.backup_controller = backupController.id;
              await network.save();
            }
            await reloadInstanceConfig();
            success.push(config.name);
          } catch {
            errors.push(config.name);
          }
        }),
      );

      res.status(200).json({errors: errors, success: success});
    });
    return router;
  }
}
