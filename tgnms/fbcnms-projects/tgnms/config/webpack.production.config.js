/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */
const webpackConfig = require('fbcnms-webpack-config/production-webpack');
const paths = require('fbcnms-webpack-config/paths');

const config = webpackConfig.createProductionWebpackConfig({
  extraPaths: [paths.resolveApp('shared')],
});

module.exports = config;
