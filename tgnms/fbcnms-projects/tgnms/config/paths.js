/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const fs = require('fs');
const path = require('path');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) =>
  path.resolve(appDirectory, relativePath);

module.exports = {
  appIndexJs: resolveApp('app/main.js'),
  loginIndexJs: resolveApp('app/views/login/login.js'),
  appSrc: resolveApp('app'),
  distPath: resolveApp('dist'),
  sharedSrc: resolveApp('shared'),
  sharedPackages: resolveApp('../../fbcnms-packages'),
  resolveApp,
};
