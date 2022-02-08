/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
export const NETWORK_BASE = '/:view/:networkName';
export const PLANNING_BASE_PATH = NETWORK_BASE + '/planning';
export const PLANNING_FOLDER_PATH = PLANNING_BASE_PATH + '/folder/:folderId';
export const PLANNING_PLAN_PATH = PLANNING_FOLDER_PATH + '/plan';
export const PLANNING_SITESFILE_PATH = PLANNING_FOLDER_PATH + '/sites';
export const NETWORK_TABLES_BASE_PATH = NETWORK_BASE + '/:table?';
export const MAP_PATH = `/map/:networkName`;
export const TABLES_PATH = `/tables/:networkName`;
export const DASHBOARDS_PATH = `/dashboards/:networkName`;
export const TROUBLESHOOTING_PATH = `/troubleshooting/:networkName`;
export const ALARMS_PATH = `/alarms/:networkName`;
export const UPGRADE_PATH = `/upgrade/:networkName`;
export const NETWORK_CONFIG_PATH = `/network_config/:networkName`;
export const CONFIG_PATH = '/config';
export const SYSDUMPS_PATH = `/sysdumps/:networkName`;
