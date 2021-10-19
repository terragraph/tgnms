/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {Api} from '../Api';

type HealthResponse = {|
  status: $Values<typeof STATUS>,
|};

const STATUS = {
  UP: 'UP',
  DEGRADED: 'DEGRADED',
  DOWN: 'DOWN',
};

export default class HealthcheckRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    router.get('/', (req, res) => {
      const response: HealthResponse = {
        status: STATUS.UP,
      };

      return res.status(200).json(response);
    });
    return router;
  }
}
