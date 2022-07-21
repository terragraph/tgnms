/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

/*
 * Mocks out console commands to keep test output clean
 * and to allow us to assert if they were called.
 *
 * IMPORTANT:
 * If you are debugging and adding console commands, you cannot call this
 * function in your test. If you want to spy on these commands, but still
 * see their output, use jest.spyOn.
 */
export function mockConsole() {
  const mock = {
    warn: jest.fn<$ReadOnlyArray<*>, void>(),
    error: jest.fn<$ReadOnlyArray<*>, void>(),
    log: jest.fn<$ReadOnlyArray<*>, void>(),
  };
  global.console = mock;
  return mock;
}

type User = {|
  id: string,
  name: string,
  email: string,
  roles: Array<string>,
|};

export function mockUser(merge?: $Shape<User>): User {
  return {
    id: 'testid',
    name: 'tg',
    email: 'tg@example.com',
    roles: [],
    ...merge,
  };
}
