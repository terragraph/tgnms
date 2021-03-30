/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @format
 */

'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const {resolve} = require('path');
const {promisify} = require('util');

function test(info, f, ...args) {
  assert(typeof f === 'function');
  const testFn = () => f(...args);
  testFn.info = info; // for debugging
  return testFn;
}

function testAsync(info, f, ...args) {
  return test(info, promisify(f), ...args);
}

function testENOENT(info, f, ...args) {
  return test(info, () => {
    let error;
    try {
      f(...args);
    } catch (e) {
      error = e;
    }
    assert.equal(error.code, 'ENOENT');
  });
}

function seq(a, b) {
  return async (...args) => b(await a(...args));
}

function assertText(input) {
  assert.equal(input.toString(), 'test text here\n');
}

function assertFalse(input) {
  assert(!input);
}

module.exports = root => {
  const SYMLINK = resolve(root, 'test.txt.symlink');
  const TXTFILE = resolve(root, 'test.txt');
  const MISSING = resolve(root, '_MISSING_');
  return [
    test('fs.realpathSync', fs.realpathSync, SYMLINK),
    testAsync('fs.realpath', fs.realpath, SYMLINK),
    test('fs.readFileSync', seq(fs.readFileSync, assertText), TXTFILE),
    test('fs.readFile', seq(promisify(fs.readFile), assertText), TXTFILE),
    testENOENT('fs.readFileSync', fs.readFileSync, MISSING),
    test('fs.existsSync', seq(fs.existsSync, assert), TXTFILE),
    test('fs.existsSync', seq(fs.existsSync, assertFalse), MISSING),
    test('fs.exists', seq(promisify(fs.exists), assert), TXTFILE),
    test('fs.exists', seq(promisify(fs.exists), assertFalse), MISSING),

    // tests for `fs.lstat`, `.stat`, `access`, `.readdir`, `.open`,
    // and their synchronous variants can be added with the same pattern.
    // use `SYMLINK` for `lstat`, `__dirname` for `readDir`, and `TXTFILE` for
    // the rest.
  ];
};
