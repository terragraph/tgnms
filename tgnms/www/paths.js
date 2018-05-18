/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

// config after eject: we're in ./config/
module.exports = {
  appIndexJs: resolveApp('app/main.js'),
  appSrc: resolveApp('app'),
  distPath: resolveApp('dist'),
};
