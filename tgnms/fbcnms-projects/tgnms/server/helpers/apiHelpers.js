/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const request = require('request');
const logger = require('../log')(module);
const path = require('path');
import {ValidationResult} from '../../shared/validation';

const {API_REQUEST_TIMEOUT} = require('../config');

/**
 * Handles different types of http error scenarios and logging -
 * Example:
 * router.get('/', (req,res) => {
 *  doSomething().catch(createErrorHandler(res))
 * })
 */
export function createErrorHandler(res) {
  return error => {
    //only return an error message if it's an expected error
    if (error instanceof ValidationResult || error.expected === true) {
      return res.status(400).send({
        message: error.message,
        ...error,
      });
    }
    logger.error(error);
    return res.status(500).end();
  };
}

/**
 * Safely join a path (preventing directory traversal via '../')
 * use this to sanitize an http parameter when it maps to a filesystem path
 */
export function safePathJoin(parent, unsafePath) {
  return path.join(
    parent,
    path.normalize(unsafePath).replace(/^(\.\.[\/\\])+/, ''),
  );
}

/**
 * Creates a request (default GET) with the options provided and logs it
 */
export function createRequest(options) {
  const requestOptions = typeof options === 'string' ? {url: options} : options;
  logger.info(
    `Network request: ${
      requestOptions.method ? requestOptions.method : 'GET'
    } ${requestOptions.url}`,
  );
  return new Promise((resolve, reject) => {
    try {
      return request(
        Object.assign({timeout: API_REQUEST_TIMEOUT}, requestOptions),
        (err, response, body) => {
          if (err) {
            return reject(err, body);
          }
          return resolve(response);
        },
      );
    } catch (err) {
      return reject(err);
    }
  });
}
