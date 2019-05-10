/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
/* eslint-disable */

'use strict';

const fs = require('fs');
const path = require('path');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

// config after eject: we're in ./config/
module.exports = {
  appIndexJs: resolveApp('app/main.js'),
  loginIndexJs: resolveApp('app/views/login/login.js'),
  appSrc: resolveApp('app'),
  distPath: resolveApp('dist'),
  sharedSrc: resolveApp('shared'),
  sharedPackages: resolveApp('../../fbcnms-packages'),
};
