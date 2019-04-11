/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  coverageReporters: ['json'],
  modulePathIgnorePatterns: [],
  testPathIgnorePatterns: ['/node_modules/'],
  projects: [
    {
      name: 'server',
      collectCoverageFrom: [
        'server/**/*.js',
        '!**/__mocks__/**',
        '!**/__tests__/**',
      ],
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/**/__tests__/*.tests.js'],
    },
    {
      name: 'app',
      collectCoverageFrom: [
        'app/**/*.js',
        '!**/__mocks__/**',
        '!**/__tests__/**',
      ],
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/app/**/__tests__/*.tests.js'],
    },
  ],
};
