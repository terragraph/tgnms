/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 * @format
 */

'use strict';

const {ZipBuild} = require('./zip');

function merge(output, zips) {
  const build = new ZipBuild(output);
  for (const {prefix, zip} of zips) {
    build.append(zip, prefix);
  }
  build.writeAndClose();
}

function main() {
  const argv = process.argv.slice(2);
  const output = argv[0];
  const zips = [];
  for (let i = 1; i < argv.length; ++i) {
    if (argv[i] === '--prefix') {
      zips.push({prefix: argv[i + 1], zip: argv[i + 2]});
      i += 2;
    } else {
      zips.push({prefix: null, zip: argv[i]});
    }
  }

  merge(output, zips);
}

if (require.main === module) {
  main();
}
