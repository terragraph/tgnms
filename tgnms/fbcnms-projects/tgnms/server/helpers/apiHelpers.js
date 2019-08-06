/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
const path = require('path');
const logger = require('../log')(module);
import {ValidationResult} from '../../shared/validation';

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
