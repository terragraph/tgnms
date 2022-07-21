/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

// View names, icons, and routes
import * as React from 'react';
import AlarmIcon from '@material-ui/icons/Alarm';
import BuildIcon from '@material-ui/icons/Build';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DashboardIcon from '@material-ui/icons/Dashboard';
import GetAppIcon from '@material-ui/icons/GetApp';
import HealthDashboard from '@fbcnms/tg-nms/app/views/dashboards/HealthDashboard';
import MapIcon from '@material-ui/icons/Map';
import NetworkConfig from '@fbcnms/tg-nms/app/views/config/NetworkConfig';
import NetworkDashboards from '@fbcnms/tg-nms/app/views/dashboards/NetworkDashboards';
import NetworkMap from '@fbcnms/tg-nms/app/views/map/NetworkMap';
import NetworkTables from '@fbcnms/tg-nms/app/views/tables/NetworkTables';
import NetworkUpgrade from '@fbcnms/tg-nms/app/views/upgrade/NetworkUpgrade';
import NmsAlarms from '@fbcnms/tg-nms/app/views/alarms/NmsAlarms';
import NodeSysdumps from '@fbcnms/tg-nms/app/views/sysdumps/NodeSysdumps';
import PublicIcon from '@material-ui/icons/Public';
import TableChartIcon from '@material-ui/icons/TableChart';
import TimelineIcon from '@material-ui/icons/Timeline';
import Troubleshooting from '@fbcnms/tg-nms/app/views/troubleshooting/Troubleshooting';
import {
  ALARMS_PATH,
  DASHBOARDS_PATH,
  HEALTH_DASHBOARD_PATH,
  MAP_PATH,
  NETWORK_CONFIG_PATH,
  SYSDUMPS_PATH,
  TABLES_PATH,
  TROUBLESHOOTING_PATH,
  UPGRADE_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
import {isAuthorized} from '@fbcnms/tg-nms/app/helpers/UserHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';

import type {Permission} from '@fbcnms/tg-nms/shared/auth/Permissions';

export type ViewType = {
  name: string,
  icon: React.Element<*>,
  path: string,
  component: React.ComponentType<*>,
  hideCondition?: () => boolean,
  permissions?: Array<Permission>,
};

export const NETWORK_VIEWS: Array<ViewType> = [
  {
    name: 'Health Dashboard',
    icon: <PublicIcon />,
    path: HEALTH_DASHBOARD_PATH,
    component: HealthDashboard,
    hideCondition: () => true,
  },
  {
    name: 'Map',
    icon: <MapIcon />,
    path: MAP_PATH,
    component: NetworkMap,
  },
  {
    name: 'Tables',
    icon: <TableChartIcon />,
    path: TABLES_PATH,
    component: NetworkTables,
  },
  {
    name: 'Dashboards',
    icon: <DashboardIcon />,
    path: DASHBOARDS_PATH,
    component: NetworkDashboards,
    hideCondition: () => !isFeatureEnabled('GRAFANA_ENABLED'),
  },

  {
    name: 'Troubleshooting',
    icon: <TimelineIcon />,
    path: TROUBLESHOOTING_PATH,
    component: Troubleshooting,
    hideCondition: () => !isFeatureEnabled('TROUBLESHOOTING_ENABLED'),
  },
  {
    name: 'Alerts',
    icon: <AlarmIcon />,
    path: ALARMS_PATH,
    component: NmsAlarms,
    hideCondition: () => !isFeatureEnabled('ALARMS_ENABLED'),
  },
  {
    name: 'Upgrade',
    icon: <CloudUploadIcon />,
    path: UPGRADE_PATH,
    component: NetworkUpgrade,
    permissions: ['UPGRADE_READ', 'UPGRADE_WRITE'],
    hideCondition: () => !isAuthorized(['UPGRADE_READ', 'UPGRADE_WRITE']),
  },
  {
    name: 'Network Configuration',
    icon: <BuildIcon />,
    path: NETWORK_CONFIG_PATH,
    component: NetworkConfig,
    permissions: ['CONFIG_READ', 'CONFIG_WRITE'],
    hideCondition: () => !isAuthorized(['CONFIG_READ', 'CONFIG_WRITE']),
  },
  {
    name: 'Sysdumps',
    icon: <GetAppIcon />,
    path: SYSDUMPS_PATH,
    component: NodeSysdumps,
    hideCondition: () => !isFeatureEnabled('GET_SYSDUMP_ENABLED'),
  },
];
