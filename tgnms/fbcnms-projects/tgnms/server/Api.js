/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {createApi} from './helpers/apiHelpers';
const logger = require('./log');
import type {Request, Response} from './types/express';
import type {Router} from 'express';

export class Api {
  logger: $winstonLogger<*>;
  initLogger(filename: string) {
    this.logger = logger({filename});
  }
  createApi() {
    return createApi();
  }
  async init() {}
  makeRoutes(): Router<Request, Response> {
    return this.createApi();
  }
}
