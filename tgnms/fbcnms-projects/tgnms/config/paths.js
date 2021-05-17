/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
