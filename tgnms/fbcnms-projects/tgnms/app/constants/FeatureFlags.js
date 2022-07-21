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
 * Should only be used to flag features on/off. Don't use this file for
 * providing configuration values to the frontend.
 */

import type {FeatureFlagKey} from '@fbcnms/tg-nms/shared/FeatureFlags';

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  const flags = window?.CONFIG?.featureFlags;
  if (!flags) {
    return false;
  }
  const val = flags[flag];

  if (typeof val === 'undefined') {
    console.error(
      `Invalid feature flag: ${flag} - must be one of: ${Object.keys(
        flags,
      ).join(', ')}`,
    );
    return false;
  }
  return val;
}
