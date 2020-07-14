/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const express = require('express');
const request = require('request');
const logger = require('../log')(module);
const path = require('path');
const {API_REQUEST_TIMEOUT} = require('../config');

import type {Request, Response} from '../types/express';
import type {Router} from 'express';

export function createApi(): Router<Request, Response> {
  const router = express.Router<Request, Response>();
  return router;
}

/**
 * Handles different types of http error scenarios and logging -
 * Example:
 * router.get('/', (req,res) => {
 *  doSomething().catch(createErrorHandler(res))
 * })
 */
export function createErrorHandler(res: Response) {
  return (error: Error & {expected?: boolean}) => {
    //only return an error message if it's an expected error
    if (error.expected === true) {
      return res.status(400).send({
        message: error.message,
        ...error,
      });
    }
    logger.error(error.stack);
    return res.status(500).send({});
  };
}

/**
 * Safely join a path (preventing directory traversal via '../')
 * use this to sanitize an http parameter when it maps to a filesystem path
 */
export function safePathJoin(parent: string, unsafePath: string) {
  return path.join(
    parent,
    path.normalize(unsafePath).replace(/^(\.\.[\/\\])+/, ''),
  );
}

/**
 * Creates a request (default GET) with the options provided and logs it
 */
type Req = $Shape<{
  uri: string,
  method: string,
  timeout: number | string,
  json: Object,
  qs: Object,
}>;
export function createRequest(options: string | Req): Promise<any> {
  const requestOptions = typeof options === 'string' ? {uri: options} : options;
  logger.info(
    `Network request: ${
      requestOptions.method ? requestOptions.method : 'GET'
    } ${requestOptions.uri}`,
  );
  return new Promise((resolve, reject) => {
    try {
      return request(
        Object.assign(({timeout: API_REQUEST_TIMEOUT}: Req), requestOptions),
        (err, response, _body) => {
          if (err) {
            return reject(err);
          }
          return resolve(response);
        },
      );
    } catch (err) {
      return reject(err);
    }
  });
}
