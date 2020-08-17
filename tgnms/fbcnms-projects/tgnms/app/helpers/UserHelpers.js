/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {getUser} from '../common/uiConfig';
import {isAuthorized as isAuthorizedShared} from '../../shared/auth/Permissions';
import {isFeatureEnabled} from '../constants/FeatureFlags';
import type {Permission} from '../../shared/auth/Permissions';

/**
 * Checks if the currently loaded user has the specified permissions.
 */
export function isAuthorized(permissions: Permission | Array<Permission>) {
  // Maintain backward compatibility
  if (!isFeatureEnabled('LOGIN_ENABLED')) {
    return true;
  }
  return isAuthorizedShared(getUser(), permissions);
}
