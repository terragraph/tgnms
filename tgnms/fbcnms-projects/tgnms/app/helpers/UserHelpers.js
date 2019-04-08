/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {User} from '../../shared/auth/User';
import type {Permission} from '../../shared/auth/Permissions';
import {isAuthorized as isAuthorizedShared} from '../../shared/auth/Permissions';

export function getUser(): ?User {
  if (window.CONFIG && window.CONFIG.user) {
    return window.CONFIG.user;
  }
}

/**
 * Checks if the currently loaded user has the specified permissions.
 */
export function isAuthorized(permissions: Permission | Array<Permission>) {
  // Maintain backward compatibility
  if (!window.CONFIG.env.LOGIN_ENABLED) {
    return true;
  }
  return isAuthorizedShared(getUser(), permissions);
}
