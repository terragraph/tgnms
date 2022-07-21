/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import {getUser} from '../common/uiConfig';
import {isAuthorized as isAuthorizedShared} from '@fbcnms/tg-nms/shared/auth/Permissions';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import type {Permission} from '@fbcnms/tg-nms/shared/auth/Permissions';

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
