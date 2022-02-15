/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * Only import flow types into this file!!
 */
import type {UIEnv} from './dto/UI';

export type FeatureFlagDef = {|
  isDefaultEnabled: boolean,
  customFlag?: UIEnv => boolean,
|};

export type UIFeatureFlags = {|
  [FeatureFlagKey]: boolean,
|};

export type FeatureFlagKey = $Keys<typeof FEATURE_FLAGS>;
export const FEATURE_FLAGS: {[FeatureFlagKey]: FeatureFlagDef} = {
  // needs certain configs
  LOGIN_ENABLED: {isDefaultEnabled: false},
  GRAFANA_ENABLED: {
    isDefaultEnabled: true,
  },
  SERVICE_AVAILABILITY_ENABLED: {isDefaultEnabled: false},
  MAP_HISTORY_ENABLED: {isDefaultEnabled: true},
  SOFTWARE_PORTAL_ENABLED: {isDefaultEnabled: false},
  MAPSTYLE_FACEBOOK_ENABLED: {isDefaultEnabled: true},
  MAPSTYLE_MAPBOX_ENABLED: {isDefaultEnabled: false},
  //beta features
  NMS_SETTINGS_ENABLED: {isDefaultEnabled: true},
  NETWORKTEST_ENABLED: {isDefaultEnabled: true},
  TOPOLOGY_HISTORY_ENABLED: {isDefaultEnabled: true},
  SCANSERVICE_ENABLED: {isDefaultEnabled: true},
  L2_TUNNELS_ENABLED: {isDefaultEnabled: true},
  JSON_CONFIG_ENABLED: {isDefaultEnabled: true},
  FORM_CONFIG_ENABLED: {isDefaultEnabled: true},
  TABLE_CONFIG_ENABLED: {isDefaultEnabled: true},
  ODS_ENABLED: {isDefaultEnabled: false},

  //experimental
  NMS_BACKUP_ENABLED: {isDefaultEnabled: false},
  GET_SYSDUMP_ENABLED: {isDefaultEnabled: false},
  MAP_ANNOTATIONS_ENABLED: {isDefaultEnabled: false},
  ALARMS_ENABLED: {isDefaultEnabled: false},
  DEFAULT_ROUTES_HISTORY_ENABLED: {isDefaultEnabled: false},
  LINK_BUDGETING_ENABLED: {isDefaultEnabled: false},
  ALERTS_LAYER_ENABLED: {isDefaultEnabled: false},
  TROUBLESHOOTING_ENABLED: {isDefaultEnabled: false},
  NETWORK_TUTORIAL: {isDefaultEnabled: true},
  SOLUTION_AUTOMATION_ENABLED: {isDefaultEnabled: false},
  QOS_CONFIG: {isDefaultEnabled: false},
  NETWORK_PLANNING_ENABLED: {isDefaultEnabled: false},

  //deprecated
  WEBSOCKETS_ENABLED: {isDefaultEnabled: false},
  NOTIFICATION_MENU_ENABLED: {isDefaultEnabled: false},
};
