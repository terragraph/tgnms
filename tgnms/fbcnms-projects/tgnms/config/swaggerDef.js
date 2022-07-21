/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */
/* eslint-disable */

const options = {
  openapi: '3.0.0',
  info: {title: 'Terragraph NMS', version: '1.0.0', description: ''},
  // swagger-jsdoc parses comments from js files and yaml files
  apis: ['./server/*/*.yaml', './server/*/routes.js'],
};

module.exports = options;
