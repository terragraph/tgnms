/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type {ExpressRequest, ExpressResponse} from 'express';
const express = require('express');
const router: express.Router<
  ExpressRequest,
  ExpressResponse,
> = express.Router();

const STATUS = {
  UP: 'UP',
  DEGRADED: 'DEGRADED',
  DOWN: 'DOWN',
};

type HealthResponse = {|
  status: $Values<typeof STATUS>,
|};

router.get('/', (req: ExpressRequest, res: ExpressResponse) => {
  const response: HealthResponse = {
    status: STATUS.UP,
  };

  return res.status(200).json(response);
});

module.exports = router;
