/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

const webpackConfig = require('@fbcnms/webpack-config/dev-webpack');
const paths = require('./paths');

const config = webpackConfig.createDevWebpackConfig({
  extraPaths: paths.extraPaths,
  hot: true,
});

module.exports = config;
