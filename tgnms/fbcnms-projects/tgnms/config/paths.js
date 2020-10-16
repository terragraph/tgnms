/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const paths = require('@fbcnms/webpack-config/paths');

module.exports = {
  ...paths,
  extraPaths: [
    paths.resolveApp('shared'),
    paths.resolveApp('../../node_modules/@fbcnms'), //transform fbcnms-packages
  ],
};
