/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
import type {MapStyle, UIConfig, UIEnv} from '@fbcnms/tg-nms/shared/dto/UI';
import type {User} from '@fbcnms/tg-nms/shared/auth/User';

export function getUIConfig(): UIConfig {
  if (window.CONFIG) {
    return window.CONFIG;
  }
  return {
    env: {},
    networks: {},
    user: null,
    version: 'none',
    featureFlags: {},
    mapStyles: [],
  };
}

export function getMapStyles(): Array<MapStyle> {
  const {mapStyles} = getUIConfig();
  return mapStyles;
}

export function getUIEnv(): UIEnv {
  const {env} = getUIConfig();
  return env;
}

export function getUIEnvVal(envKey: $Keys<UIEnv>): string {
  const {env} = getUIConfig();
  return env[envKey];
}

export function getUser(): ?User {
  const config = getUIConfig();
  return config?.user;
}
