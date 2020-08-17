/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import type {UIConfig, UIEnv} from '../../shared/dto/UI';
import type {User} from '../../shared/auth/User';

export function getUIConfig(): UIConfig {
  if (window.CONFIG) {
    return window.CONFIG;
  }
  return {env: {}, networks: {}, user: null, version: 'none'};
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
