/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
