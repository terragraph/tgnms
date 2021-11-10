/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
export type CreatePlanFolderRequest = {|
  name: string,
|};
export type UpdatePlanFolderRequest = {|
  id: number,
  name: string,
|};

type PlanParams = {|
  name: string,
  dsmFileId?: ?number,
  boundaryFileId?: ?number,
  sitesFileId?: ?number,
|};
export type CreateNetworkPlanRequest = {|
  folderId: number,
  ...PlanParams,
|};
export type UpdateNetworkPlanRequest = {|
  id: number,
  ...PlanParams,
|};

export type ActionResult = {|
  message?: string,
  errors?: Array<ErrorMessage>,
|};

export type LaunchPlanResult = {|
  ...ActionResult,
  state: NetworkPlanStateType,
|};

export type ErrorMessage = {|
  message: string,
|};

export const NETWORK_PLAN_STATE = {
  DRAFT: 'DRAFT',
  UPLOADING_INPUTS: 'UPLOADING_INPUTS',
  LAUNCH_ERROR: 'LAUNCH_ERROR',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  CANCELLED: 'CANCELLED',
};

// Before the plan is officially launched in ANP.
export const PRELAUNCH_NETWORK_PLAN_STATES = new Set<string>([
  NETWORK_PLAN_STATE.DRAFT,
  NETWORK_PLAN_STATE.UPLOADING_INPUTS,
  NETWORK_PLAN_STATE.LAUNCH_ERROR,
]);

// After the user decides to launch the plan but before the plan
// is officially launched in ANP.
export const LAUNCHING_NETWORK_PLAN_STATES = new Set<string>([
  NETWORK_PLAN_STATE.UPLOADING_INPUTS,
]);

// After the plan is officially launched in ANP but before any results
// are determined.
export const RUNNING_NETWORK_PLAN_STATES = new Set<string>([
  NETWORK_PLAN_STATE.RUNNING,
]);

export type NetworkPlanStateType = $Keys<typeof NETWORK_PLAN_STATE>;

export type PlanFolder = {|
  id: number,
  name: string,
|};

export type NetworkPlan = {|
  id: number,
  folderId: number,
  name: string,
  state: NetworkPlanStateType,
  dsmFile?: ?InputFile,
  boundaryFile?: ?InputFile,
  sitesFile?: ?InputFile,
|};

export const FILE_STATE = {
  pending: 'pending',
  uploading: 'uploading',
  ready: 'ready',
};
export type FileStateKey = $Keys<typeof FILE_STATE>;
export const FILE_SOURCE = {
  local: 'local',
  fbid: 'fbid',
};
export type FileSourceKey = $Keys<typeof FILE_SOURCE>;

export type NetworkPlanFile = {|
  id: number,
  role: string,
  name: string,
|};

export type InputFile = {|
  id: number,
  role: string,
  name: string,
  source?: 'fbid' | 'local',
  fbid?: ?string,
|};
export type PlanError = {|
  error_message: string,
|};

/**
 * Creates a db row either referencing an existing fbinfra file, or a new,
 *  yet-to-be-uploaded draft file.
 */
export type CreateInputFileRequest =
  | {|
      planId: number,
      source: 'fbid',
      fbid: string,
    |}
  | {|
      planId: number,
      source: 'local',
      role: string,
      name: string,
    |};
