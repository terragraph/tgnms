/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

// NOTE: Prefix-based routes, meaning if a url starts with a string from this
// list, then it is considered an open route
export default [
  '/favicon.ico',
  '/static/dist/vendor',
  '/static/dist/login',
  '/healthcheck',
  '/static/css',
  '/static/fonts',
  '/static/images',
  '/user/login',
  '/user/logout',
  // protected by middleware/otp
  '/static/tg-binaries',
];
