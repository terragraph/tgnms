/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @format
 */

'use strict';

const assert = require('assert');
const tests = require('tests/all');

async function main() {
  for (const test of tests(__dirname)) {
    await test();
  }
  console.log('OK');
}

assert(module === require.main);

main().catch(e =>
  process.nextTick(() => {
    throw e;
  }),
);
