/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {ExpressRequest, ExpressResponse, NextFunction} from 'express';
import type {FBCNMSRequest} from '@fbcnms/auth/access';
import type {FeatureID} from '@fbcnms/types/features';

export type RequestInfo = {
  isDev: boolean,
  organization: string,
};

// A rule that gets evaluated when the featureflag is checked
// true means it passes the check
// false means it fails the check
// null means continue to the next check
type FeatureFlagRule = (req: RequestInfo) => ?boolean;

const AlwaysEnabledInTestEnvRule: FeatureFlagRule = (reqInfo: RequestInfo) => {
  if (reqInfo.isDev) {
    return true;
  }
  if (reqInfo.organization.endsWith('-test')) {
    return true;
  }
  return null;
};

function extractRequestInfo(
  req: ExpressRequest,
  organization: ?string,
): RequestInfo {
  const hostname = req.hostname || 'UNKNOWN_HOST';
  return {
    isDev: hostname.includes('localhost') || hostname.includes('localtest.me'),
    organization: organization ?? '',
  };
}

export type FeatureConfig = {
  id: FeatureID,
  title: string,
  enabledByDefault: boolean,
  rules?: FeatureFlagRule[],
  publicAccess?: boolean,
};

const {FeatureFlag} = require('@fbcnms/sequelize-models');

export const arrayConfigs = [
  {
    id: 'sso_example_feature',
    title: 'SSO Example Feature',
    enabledByDefault: false,
  },
  {
    id: 'audit_log_example_feature',
    title: 'Audit Log Example Feature',
    enabledByDefault: true,
  },
  {
    id: 'audit_log_view',
    title: 'Audit Log View',
    enabledByDefault: false,
  },
  {
    id: 'third_party_devices',
    title: 'Third Party Devices',
    enabledByDefault: false,
  },
  {
    id: 'network_topology',
    title: 'Network Topology',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'lte_network_metrics',
    title: 'LTE Network Metrics',
    enabledByDefault: true,
  },
  {
    id: 'site_survey',
    title: 'Site Survey',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'alerts',
    title: 'Alerts',
    enabledByDefault: true,
  },
  {
    id: 'alert_receivers',
    title: 'Alert Receivers',
    enabledByDefault: true,
  },
  {
    id: 'alert_routes',
    title: 'Alert Routes',
    enabledByDefault: false,
  },
  {
    id: 'alert_suppressions',
    title: 'Alert Suppressions',
    enabledByDefault: false,
  },
  {
    id: 'logs',
    title: 'Logs',
    enabledByDefault: false,
  },
  {
    id: 'equipment_export',
    title: 'Equipment Export',
    enabledByDefault: true,
  },
  {
    id: 'file_categories',
    title: 'File Categories (for IpT)',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'floor_plans',
    title: 'Floor Plans',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'deprecated_imports',
    title: 'Show Deprecated Imports',
    enabledByDefault: false,
  },
  {
    id: 'work_order_map',
    title: 'Work order map',
    enabledByDefault: false,
  },
  {
    id: 'documents_site',
    title: 'Documents Site',
    enabledByDefault: true,
  },
  {
    id: 'services',
    title: 'Services',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'coverage_maps',
    title: 'Coverage Maps',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'planned_equipment',
    title: 'Planned Equipment',
    enabledByDefault: false,
  },
  {
    id: 'multi_subject_reports',
    title: 'Multi Subject Reports',
    enabledByDefault: true,
  },
  {
    id: 'equipment_live_status',
    title: 'Equipment Live Status',
    enabledByDefault: false,
  },
  {
    id: 'logged_out_alert',
    title: 'Logged Out Alert',
    enabledByDefault: true,
  },
  {
    id: 'external_id',
    title: 'External ID',
    enabledByDefault: true,
  },
  {
    id: 'checklistcategories',
    title: 'Site Surveys - Work Order Checklist Categories',
    enabledByDefault: false,
  },
  {
    id: 'saved_searches',
    title: 'Saved Searches',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'user_management_dev',
    title: 'User Management - Dev mode',
    enabledByDefault: false,
  },
  {
    id: 'grafana_metrics',
    title: 'Include tab for Grafana in the Metrics page',
    enabledByDefault: true,
  },
  {
    id: 'dashboard_v2',
    title: 'V2 LTE Dashboard',
    enabledByDefault: true,
  },
  {
    id: 'work_order_activities_display',
    title: 'Work Order Activities Display',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'mandatory_properties_on_work_order_close',
    title: 'Mandatory properties on work order close',
    enabledByDefault: false,
    publicAccess: true,
  },
  {
    id: 'async_export',
    title: 'Asynchronous location export',
    enabledByDefault: false,
  },
  {
    id: 'add_port_to_service',
    title: 'Add standalone port to service',
    enabledByDefault: false,
  },
  {
    id: 'execute_automation_flows',
    title: 'Execute automation flows',
    enabledByDefault: false,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'workorder_new_status',
    title: 'Work Order New Status',
    enabledByDefault: false,
  },
  {
    id: 'projects_bulk_upload',
    title: 'Project Bulk Upload',
    enabledByDefault: false,
    publicAccess: true,
    rules: [AlwaysEnabledInTestEnvRule],
  },
  {
    id: 'enable_backplane_connections',
    title: 'Enable Backplane Connections',
    enabledByDefault: false,
  },
];

export const featureConfigs: {[FeatureID]: FeatureConfig} = {};
arrayConfigs.map(config => (featureConfigs[config.id] = config));

export async function isFeatureEnabled(
  reqInfo: RequestInfo,
  featureId: FeatureID,
  organization: ?string,
): Promise<boolean> {
  const config = featureConfigs[featureId];

  if (config.rules) {
    for (const rule of config.rules) {
      const enabled = rule(reqInfo);
      if (enabled !== null && enabled !== undefined) {
        return enabled;
      }
    }
  }

  if (organization) {
    const flag = await FeatureFlag.findOne({where: {organization, featureId}});
    if (flag) {
      return flag.enabled;
    }
  }

  return featureConfigs[featureId].enabledByDefault;
}

export async function getEnabledFeatures(
  req: ExpressRequest,
  organization: ?string,
  publicAccess: ?boolean,
): Promise<FeatureID[]> {
  const reqInfo = extractRequestInfo(req, organization);
  const results = await Promise.all(
    arrayConfigs.map(async (config): Promise<?FeatureID> => {
      if (publicAccess && !config.publicAccess) {
        return null;
      }
      const enabled = await isFeatureEnabled(reqInfo, config.id, organization);
      return enabled ? config.id : null;
    }),
  );

  return results.filter(Boolean);
}

export function insertFeatures(
  req: FBCNMSRequest,
  res: ExpressResponse,
  next: NextFunction,
) {
  if (req.user.organization) {
    getEnabledFeatures(req, req.user.organization)
      .then(enabledFeatures => {
        const features = Array.from(enabledFeatures, feature =>
          String(feature),
        ).join();
        req.headers['x-auth-features'] = features;
        next();
      })
      .catch(err => next(err));
  } else {
    next();
  }
}

export default {...featureConfigs};
