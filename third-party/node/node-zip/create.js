/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 * @format
 */

'use strict';

const assert = require('assert');
const os = require('os');
const path = require('path');
const {ZipBuild} = require('./zip');

const relative =
  os.platform() === 'win32'
    ? (from, to) => path.relative(from, to).replace(/\\/g, '/')
    : path.relative;

const COMPRESSION_LEVEL = 4;

function create(output, baseDir, paths) {
  const build = new ZipBuild(output);
  for (const path of paths) {
    const entryName = relative(baseDir, path);
    assert(!/^[.]{1,2}\//.test(entryName), `${path} is not in ${baseDir}.`);
    build.add(path, entryName, COMPRESSION_LEVEL);
  }
  build.writeAndClose();
}

function main() {
  const argv = process.argv.slice(2);
  const baseOption = argv.indexOf('--base');

  let baseDir;
  if (baseOption > -1) {
    [, baseDir] = argv.splice(baseOption, 2);
    assert(baseDir != null, 'Missing value for --base option.');
  } else {
    baseDir = path.dirname(argv[0]);
  }

  const [output, ...paths] = argv;
  create(output, baseDir, paths);
}

if (require.main === module) {
  main();
}
