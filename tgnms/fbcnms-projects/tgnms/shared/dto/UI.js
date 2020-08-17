/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 * @flow strict-local
 */
import type {User as UserDto} from '../auth/User';

export type UIEnv = $Shape<{
  GRAFANA_URL: string,
  MAPBOX_ACCESS_TOKEN: string,
  ISSUES_URL: string,
  NETWORKTEST_HOST: string,
  SCANSERVICE_ENABLED: string,
  LOGIN_ENABLED: string,
  TILE_STYLE: string,
  COMMIT_DATE: string,
  COMMIT_HASH: string,
  DOC_URL: string,
  NOTIFICATION_MENU_ENABLED: string,
  SERVICE_AVAILABILITY_ENABLED: string,
  SOFTWARE_PORTAL_ENABLED: string,
  ALARMS_ENABLED: string,
  // Experimental features, remove these flags once the features are done
  DEFAULT_ROUTES_HISTORY_ENABLED: string,
  JSON_CONFIG_ENABLED: string,
  MAP_HISTORY_ENABLED: string,
  NMS_SETTINGS_ENABLED: string,
  MAP_ANNOTATIONS_ENABLED: string,
  TASK_BASED_CONFIG_ENABLED: string,
  GET_SYSDUMP_ENABLED: string,
  NMS_BACKUP_ENABLED: string,
}>;

// NetworkConfig
export type Networks = {[string]: *};
export type UIConfig = {|
  env: UIEnv,
  networks: Networks, // list of currently configured networks
  user: ?UserDto, // non-secret UI info about the currently logged-in user
  version: ?string,
|};
