/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import type {User} from './User';

/**
 * Application should be concerned with the keys of this map, the values are
 * an implementation detail which can be changed at any time.
 */
export const Permissions = {
  NODE_READ: 'tg_node_read',
  NODE_WRITE: 'tg_node_write',
};

export type Permission = $Keys<typeof Permissions>;

/**
 * Checks if the user has all PERMISSIONs specified. A permission is an
 * application specific role mapping.
 * This code is shared between frontend and backend, server/browser specific
 * apis must be avoided.
 **/
export function isAuthorized(
  user: ?User,
  permissions: Permission | Array<Permission>,
) {
  if (!user || !user.roles) {
    return false;
  }
  const roleSet = new Set(user.roles.map(x => x.toLowerCase()));
  if (typeof permissions === 'string') {
    const role = Permissions[permissions];
    return roleSet.has(role);
  }

  return permissions.every(permission => {
    const role = Permissions[permission];
    return roleSet.has(role);
  });
}
