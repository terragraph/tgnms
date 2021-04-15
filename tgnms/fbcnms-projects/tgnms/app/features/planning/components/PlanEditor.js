/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import SelectOrUploadANPFile from './SelectOrUploadANPFile';
import TextField from '@material-ui/core/TextField';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import type {
  ANPPlan,
  AnpFileHandle,
  CreateANPPlanRequest,
} from '@fbcnms/tg-nms/shared/dto/ANP';

export type InputFilesByRole = {|[role: string]: AnpFileHandle|};
export default function PlanEditor({
  folderId,
  plan,
  inputFiles,
  onExit,
  onPlanCreated,
}: {
  plan: ?ANPPlan,
  inputFiles: ?InputFilesByRole,
  folderId: string,
  onExit: () => void,
  onPlanCreated: ANPPlan => void | Promise<void>,
}) {
  // reconstruct the form-state from plan and input files
  const {planState, updatePlanState, setPlanFormState} = usePlanFormState();
  React.useEffect(() => {
    const formState: CreateANPPlanRequest = {
      dsm: inputFiles ? inputFiles[FILE_ROLE.DSM_GEOTIFF]?.id : '',
      folder_id: folderId,
      plan_name: plan?.plan_name ?? '',
      boundary_polygon: inputFiles
        ? inputFiles[FILE_ROLE.BOUNDARY_FILE]?.id
        : '',
      site_list: inputFiles ? inputFiles[FILE_ROLE.URBAN_SITE_FILE]?.id : '',
    };
    setPlanFormState(formState);
  }, [plan, inputFiles, folderId, setPlanFormState]);
  const handleStartPlanClicked = React.useCallback(async () => {
    if (!validatePlanState(planState)) {
      return;
    }
    let planId = plan?.id;
    if (planId == null) {
      const createPlanResult = await networkPlanningAPIUtil.createPlan({
        ...planState,
      });
      planId = createPlanResult.id;
      onPlanCreated(createPlanResult);
    }
    const _launchPlanResult = await networkPlanningAPIUtil.launchPlan({
      id: planId,
    });
  }, [onPlanCreated, plan, planState]);

  return (
    <Grid container direction="column" spacing={2} wrap="nowrap">
      <Grid item>
        <TextField
          label="Name"
          fullWidth
          value={planState.plan_name ?? ''}
          onChange={e => {
            updatePlanState({plan_name: e.target.value});
          }}
        />
      </Grid>
      <SelectOrUploadANPFile
        label="Select DSM File"
        fileTypes=".tif"
        role={FILE_ROLE.DSM_GEOTIFF}
        initialValue={inputFiles ? inputFiles[FILE_ROLE.DSM_GEOTIFF] : null}
        onChange={f => updatePlanState({dsm: f.id})}
      />
      <SelectOrUploadANPFile
        label="Select Sites File"
        fileTypes=".csv"
        role={FILE_ROLE.URBAN_SITE_FILE}
        initialValue={inputFiles ? inputFiles[FILE_ROLE.URBAN_SITE_FILE] : null}
        onChange={f => updatePlanState({site_list: f.id})}
      />
      <SelectOrUploadANPFile
        label="Select Boundary File"
        fileTypes=".kml,.kmz"
        role={FILE_ROLE.BOUNDARY_FILE}
        initialValue={inputFiles ? inputFiles[FILE_ROLE.BOUNDARY_FILE] : null}
        onChange={f => updatePlanState({boundary_polygon: f.id})}
      />
      <Grid item container justify="flex-end" spacing={1}>
        <Grid item>
          <Button onClick={onExit} variant="outlined" size="small">
            Cancel
          </Button>
        </Grid>
        <Grid item>
          <Button
            disabled={!validatePlanState(planState)}
            onClick={handleStartPlanClicked}
            variant="contained"
            color="primary"
            size="small">
            Start Plan
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}

function usePlanFormState(): {|
  planState: CreateANPPlanRequest,
  updatePlanState: (update: $Shape<CreateANPPlanRequest>) => void,
  setPlanFormState: (state: $Shape<CreateANPPlanRequest>) => void,
|} {
  const [planState, setPlanFormState] = React.useState<
    $Shape<CreateANPPlanRequest>,
  >({});
  const updatePlanState = React.useCallback(
    (update: $Shape<CreateANPPlanRequest>) =>
      setPlanFormState(curr => ({
        ...curr,
        ...update,
      })),
    [],
  );

  return {
    planState,
    updatePlanState,
    setPlanFormState,
  };
}

function validatePlanState(state: $Shape<CreateANPPlanRequest>): boolean {
  try {
    if (!state) {
      return false;
    }
    const {plan_name, boundary_polygon, dsm, site_list} = state;
    if (
      isNullOrEmptyString(plan_name) ||
      isNullOrEmptyString(boundary_polygon) ||
      isNullOrEmptyString(dsm) ||
      isNullOrEmptyString(site_list)
    ) {
      return false;
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
