/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
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
