/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  collectCoverageFrom: [
    'server/**/*.js',
    '!**/__mocks__/**',
    '!**/__tests__/**',
  ],
  coverageReporters: ['json'],
  modulePathIgnorePatterns: [],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/'],
};
