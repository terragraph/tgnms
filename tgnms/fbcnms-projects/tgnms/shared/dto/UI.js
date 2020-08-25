/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 * @flow strict-local
 */
import type {FeatureFlagKey} from '../FeatureFlags';
import type {User as UserDto} from '../auth/User';

export type UIFeatureFlags = {|
  [FeatureFlagKey]: boolean,
|};

export type UIEnv = $Shape<{
  GRAFANA_URL: string,
  MAPBOX_ACCESS_TOKEN: string,
  ISSUES_URL: string,
  TILE_STYLE: string,
  COMMIT_DATE: string,
  COMMIT_HASH: string,
  DOC_URL: string,
}>;

// NetworkConfig
export type Networks = {[string]: *};
export type UIConfig = {|
  env: UIEnv,
  networks: Networks, // list of currently configured networks
  user: ?UserDto, // non-secret UI info about the currently logged-in user
  version: ?string,
  featureFlags: UIFeatureFlags,
|};
