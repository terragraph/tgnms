/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import type {
  InputFile,
  NetworkPlan,
  PlanFolder,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {NetworkPlanAttributes} from '@fbcnms/tg-nms/server/models/networkPlan';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';
import type {NetworkPlanFolderAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFolder';

// mapping from db row to DTO
export function folderRowToFolder(
  folder: NetworkPlanFolderAttributes,
): PlanFolder {
  return {
    id: folder.id,
    name: folder.name,
  };
}

export function planRowToNetworkPlan(plan: NetworkPlanAttributes): NetworkPlan {
  return {
    id: plan.id,
    name: plan.name,
    folderId: plan.folder_id,
    state: plan.state,
    dsmFile: plan.dsm_file ? inputFileRowToInputFile(plan.dsm_file) : null,
    boundaryFile: plan.boundary_file
      ? inputFileRowToInputFile(plan.boundary_file)
      : null,
    sitesFile: plan.sites_file
      ? inputFileRowToInputFile(plan.sites_file)
      : null,
    hardwareBoardIds: plan.hardware_board_ids,
  };
}

export function inputFileRowToInputFile(
  file: NetworkPlanFileAttributes,
): InputFile {
  return {
    id: file.id,
    name: file.name,
    role: file.role,
    source: file.source,
    fbid: file.fbid ?? null,
  };
}
