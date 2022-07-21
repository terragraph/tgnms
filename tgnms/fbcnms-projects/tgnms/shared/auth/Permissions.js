/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {User} from './User';

/**
 * Application should be concerned with the keys of this map, the values are
 * an implementation detail which can be changed at any time.
 * Important facts:
 * - Structure is TG_<category>_<read | write>
 * - Write implies read
 * - ALL_X can be substituded in place of any category's read or write role
 *    isAuthorized({roles:['TG_ALL_WRITE']}, ['TOPOLOGY_WRITE']) => true
 *    isAuthorized({roles:['TG_ALL_WRITE']}, ['TOPOLOGY_READ']) => true
 * - All write is essentially full admin privileges
 */
export const Permissions = {
  ALL_READ: 'TG_ALL_READ',
  ALL_WRITE: 'TG_ALL_WRITE',

  // Api service permissions
  IGNITION_READ: 'TG_IGNITION_READ',
  IGNITION_WRITE: 'TG_IGNITION_WRITE',

  MANAGEMENT_READ: 'TG_MANAGEMENT_READ',
  MANAGEMENT_WRITE: 'TG_MANAGEMENT_WRITE',

  CONFIG_READ: 'TG_CONFIG_READ',
  CONFIG_WRITE: 'TG_CONFIG_WRITE',

  TOPOLOGY_READ: 'TG_TOPOLOGY_READ',
  TOPOLOGY_WRITE: 'TG_TOPOLOGY_WRITE',

  SCAN_READ: 'TG_SCAN_READ',
  SCAN_WRITE: 'TG_SCAN_WRITE',

  PERFORMANCE_READ: 'TG_PERFORMANCE_READ',
  PERFORMANCE_WRITE: 'TG_PERFORMANCE_WRITE',

  UPGRADE_READ: 'TG_UPGRADE_READ',
  UPGRADE_WRITE: 'TG_UPGRADE_WRITE',

  // NMS permissions
  NMS_CONFIG_READ: 'TG_NMS_CONFIG_READ',
  NMS_CONFIG_WRITE: 'TG_NMS_CONFIG_WRITE',
};

const TG_PREFIX = 'TG';
const LEVEL_READ = 'READ';
const LEVEL_WRITE = 'WRITE';

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
  if (typeof permissions === 'string') {
    permissions = [permissions];
  }

  // quick lookup for the simple role cases
  const roleSet = new Set(
    user.roles
      .map(x => x.toUpperCase())
      .filter(role => role.startsWith(TG_PREFIX)),
  );

  return permissions.some(permission => {
    // the simplest case
    const role = Permissions[permission];
    if (roleSet.has(role)) {
      return true;
    }

    // if they have all_write, they're an admin and can do anything
    if (roleSet.has(Permissions.ALL_WRITE)) {
      return true;
    }

    // if level is read, check if they have the ALL_READ permission
    const [category, level] = permission.split('_');
    if (level === LEVEL_READ && roleSet.has(Permissions.ALL_READ)) {
      return true;
    }

    /**
     * if level is read, check if they have a write permission of
     * the same category
     **/
    if (
      level === LEVEL_READ &&
      roleSet.has(`${TG_PREFIX}_${category}_${LEVEL_WRITE}`)
    ) {
      return true;
    }

    return false;
  });
}
