/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

jest.mock('openid-client');

import PasswordGrantStrategy from '../PasswordGrantStrategy';

test('throws an error if missing params', () => {
  // $FlowFixMe - breaking flow on purpose here
  expect(() => new PasswordGrantStrategy()).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({})).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({client: {}})).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({}, () => {})).toThrow();
  // $FlowFixMe
  expect(() => new PasswordGrantStrategy({client: {}}, () => {})).not.toThrow();
});
