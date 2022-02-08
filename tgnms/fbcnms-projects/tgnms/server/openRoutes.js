/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
