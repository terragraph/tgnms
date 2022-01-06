/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import {ANP_STATUS_TYPE} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {pickBy} from 'lodash';
import type {
  ANPLink,
  ANPSite,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants.js';
import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type EnabledStatusTypes = {|[$Keys<typeof ANP_STATUS_TYPE>]: boolean|};
export type MapOptionsState = {|
  enabledStatusTypes: EnabledStatusTypes,
|};

export function suggestVersionedName(name: string): string {
  const matches = name.match(/^(.*)([vV])(\d+)$/);
  if (matches == null) {
    return `${name.trim()} V2`;
  }
  const [_match, prefix, v, num] = matches;
  const parsed = parseInt(num);
  const incremented = !isNaN(parsed) ? parsed + 1 : 1;
  return `${prefix}${v}${incremented}`;
}

export function isFinalState(status: string): boolean {
  const finalStates = new Set([
    PLAN_STATUS.FAILED,
    PLAN_STATUS.SUCCEEDED,
    PLAN_STATUS.KILLED,
  ]);
  return finalStates.has(status);
}

export function isLaunchedState(status: string): boolean {
  const launchedStates = new Set([PLAN_STATUS.RUNNING, PLAN_STATUS.SCHEDULED]);
  return launchedStates.has(status);
}

export function getEnabledStatusKeys(enabledStatusTypes: EnabledStatusTypes) {
  /**
   * EnabledStatusTypes maps from status type key->boolean. Convert this to a
   * set of enabled status types
   */
  const lookup = new Set<number>();
  for (const [key, enabled] of objectEntriesTypesafe(enabledStatusTypes)) {
    if (enabled) {
      lookup.add(ANP_STATUS_TYPE[key]);
    }
  }
  return lookup;
}

export function filterANPTopology(
  topology: ?ANPUploadTopologyType,
  options: MapOptionsState,
): ANPUploadTopologyType {
  if (topology == null) return {};
  let {links, nodes, sites, sectors} = topology;

  // Filter on the currently enabled status types.
  const enabledStatusTypes = getEnabledStatusKeys(options.enabledStatusTypes);
  links = pickBy(links, e => enabledStatusTypes.has(e.status_type));
  nodes = pickBy(nodes, e => enabledStatusTypes.has(e.status_type));
  sites = pickBy(sites, e => enabledStatusTypes.has(e.status_type));
  sectors = pickBy(sectors, e => enabledStatusTypes.has(e.status_type));

  // Add more filters here as needed.
  return {links, nodes, sites, sectors};
}

/**
 * This is the link name used during the planning stage.
 * It should be from site name to site name
 */
export function createLinkName(link: ANPLink, sites: {[string]: ANPSite}) {
  return `${sites[link.tx_site_id].name} to ${sites[link.rx_site_id].name}`;
}

/**
 * Copies a plan and navigates to it
 */
export async function copyPlan({
  plan,
  folderId,
}: {
  plan: ?NetworkPlan,
  folderId: string,
}) {
  if (plan == null) {
    return;
  }
  const {id: _, ...planParams} = plan;
  const suggestedName = suggestVersionedName(planParams.name);
  if (suggestedName != null) {
    planParams.name = suggestedName;
  }

  const newPlan = await networkPlanningAPIUtil.createPlan({
    name: suggestedName ?? planParams.name,
    folderId: parseInt(folderId),
    dsmFileId: planParams?.dsmFile?.id,
    sitesFileId: planParams?.sitesFile?.id,
    boundaryFileId: planParams?.boundaryFile?.id,
    hardwareBoardIds: planParams?.hardwareBoardIds,
  });
  return newPlan;
}
