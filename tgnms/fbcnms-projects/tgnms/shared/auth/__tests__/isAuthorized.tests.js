/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {Permissions, isAuthorized} from '../Permissions';
import type {User} from '../User';

test('users with any of the required roles are authorized', () => {
  expect(
    isAuthorized(
      mockUser({
        roles: [Permissions.TOPOLOGY_WRITE],
      }),
      ['TOPOLOGY_WRITE', 'TOPOLOGY_READ', 'CONFIG_READ'],
    ),
  ).toBe(true);
});

test('users with WRITE roles are authorized to perform WRITE actions', () => {
  expect(
    isAuthorized(
      mockUser({
        roles: [Permissions.TOPOLOGY_WRITE],
      }),
      ['TOPOLOGY_WRITE'],
    ),
  ).toBe(true);
});

test('users with WRITE roles are authorized to perform READ actions', () => {
  expect(
    isAuthorized(
      mockUser({
        roles: [Permissions.TOPOLOGY_WRITE],
      }),
      ['TOPOLOGY_READ'],
    ),
  ).toBe(true);
});

test('users with READ roles are only authorized to perform READ actions', () => {
  expect(
    isAuthorized(
      mockUser({
        roles: [Permissions.CONFIG_READ],
      }),
      ['CONFIG_READ'],
    ),
  ).toBe(true);
  expect(
    isAuthorized(
      mockUser({
        roles: [Permissions.CONFIG_READ],
      }),
      ['CONFIG_WRITE'],
    ),
  ).toBe(false);
});

test('users with ALL_READ role may perform any read action', () => {
  const user = mockUser({
    roles: [Permissions.ALL_READ],
  });
  const permissions = [
    'IGNITION_READ',
    'MANAGEMENT_READ',
    'CONFIG_READ',
    'TOPOLOGY_READ',
    'SCAN_READ',
    'PERFORMANCE_READ',
    'UPGRADE_READ',
  ];
  expect.assertions(permissions.length);

  permissions.forEach(p => {
    expect(isAuthorized(user, p)).toBe(true);
  });
});

test('users with ALL_WRITE role may perform ANY action', () => {
  const user = mockUser({
    roles: [Permissions.ALL_WRITE],
  });
  const allPermissions = Object.keys(Permissions).filter(
    p => !p.includes('ALL'),
  );
  expect.assertions(allPermissions.length);
  allPermissions.forEach(p => {
    expect(isAuthorized(user, p)).toBe(true);
  });
});

test('roles are case insensitive', () => {
  const user = mockUser({
    roles: ['tg_config_read'],
  });
  expect(isAuthorized(user, ['CONFIG_READ'])).toBe(true);
});

function mockUser(merge = {}): User {
  return {
    id: 'testid',
    name: 'tg',
    email: 'tg@example.com',
    roles: [],
    ...merge,
  };
}
