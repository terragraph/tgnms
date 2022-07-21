/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

export const ERROR_KEYS = {
  credentials: 'credentials',
  noSession: 'noSession',
  remoteDown: 'remoteDown',
  invalidConfig: 'invalidConfig',
  generic: 'generic',
};

export const ERROR_MESSAGES = {
  [ERROR_KEYS.credentials]: 'Username or password invalid',
  [ERROR_KEYS.noSession]: 'Login required',
  [ERROR_KEYS.remoteDown]:
    'Could not contact authentication server. Please contact support if this issue persists.',
  [ERROR_KEYS.invalidConfig]:
    'Invalid configuration. Please contact support if this issue persists.',
  [ERROR_KEYS.generic]:
    'An unknown error has occurred. Please contact support if this issue persists.',
};

/**
 * checks if an error name is one of the expected ERROR_MESSAGES. If so, return
 * the message to the user agent. If it is not one of the expected, handled
 * errors, return a generic error to the user agent to prevent leakage.
 */
export function isExpectedError(error: Error) {
  return error.name in ERROR_KEYS;
}

export function createExpectedError(name: $Keys<typeof ERROR_KEYS>) {
  const error = new Error(ERROR_MESSAGES[name]);
  error.name = name;
  return error;
}

export function getOidcErrorMessage(error: any) {
  if (error.error === 'invalid_grant') {
    return ERROR_MESSAGES.credentials;
  } else if (error.error === 'unauthorized_client') {
    return ERROR_MESSAGES.invalidConfig;
  } else {
    return ERROR_MESSAGES.generic;
  }
}

export function isSocketTimeoutError(error: any) {
  return error.connect === false || error.message === 'ESOCKETTIMEDOUT';
}
