/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import type {NetworkInstanceConfig} from './NetworkState';
import type {UIFeatureFlags} from '../FeatureFlags';
import type {User as UserDto} from '../auth/User';

export type UIEnv = $Shape<{
  GRAFANA_URL: string,
  KIBANA_URL: string,
  ELASTIC_URL: string,
  MAPBOX_ACCESS_TOKEN: string,
  ISSUES_URL: string,
  // TILE_STYLE: string,
  COMMIT_DATE: string,
  COMMIT_HASH: string,
  DOC_URL: string,
}>;

// NetworkConfig
export type Networks = {|[string]: NetworkInstanceConfig|};
export type MapStyle = {|name: string, url: string|};
export type UIConfig = {|
  env: UIEnv,
  networks: Networks, // list of currently configured networks
  user: ?UserDto, // non-secret UI info about the currently logged-in user
  version: ?string,
  featureFlags: UIFeatureFlags,
  mapStyles: Array<MapStyle>,
|};
