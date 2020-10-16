/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
