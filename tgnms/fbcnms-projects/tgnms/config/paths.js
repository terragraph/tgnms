/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

const paths = require('@fbcnms/webpack-config/paths');
const packageJson = require('../package.json');
const path = require('path');

const fbcnmsPackages = Object.keys(packageJson.dependencies)
  .filter(key => key.includes('@fbcnms'))
  .map(pkg =>
    path.join(
      path.resolve(require.resolve(path.join(pkg, 'package.json'))),
      '../',
    ),
  );

module.exports = {
  ...paths,
  extraPaths: [paths.resolveApp('shared'), ...fbcnmsPackages],
};
