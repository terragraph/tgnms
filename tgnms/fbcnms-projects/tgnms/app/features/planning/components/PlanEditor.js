/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import SelectANPFolder from './SelectANPFolder';
import SelectOrUploadANPFile from './SelectOrUploadANPFile';
import TextField from '@material-ui/core/TextField';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {usePlanFormState} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import type {
  ANPFileHandle,
  ANPPlan,
  CreateANPPlanRequest,
} from '@fbcnms/tg-nms/shared/dto/ANP';

export type InputFilesByRole = {|[role: string]: ANPFileHandle|};

export default function PlanEditor({
  folderId,
  plan,
  inputFiles,
  onExit,
  onPlanLaunched,
}: {
  plan: ?ANPPlan,
  inputFiles: ?InputFilesByRole,
  folderId: string,
  onExit: () => void,
  onPlanLaunched: string => void | Promise<void>,
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
  const startPlanTask = useTaskState();
  const handleStartPlanClicked = React.useCallback(async () => {
    try {
      startPlanTask.loading();
      if (!validatePlanState(planState)) {
        return;
      }
      const createPlanResult = await networkPlanningAPIUtil.createPlan({
        ...planState,
      });
      const _launchPlanResult = await networkPlanningAPIUtil.launchPlan({
        id: createPlanResult.id,
      });
      startPlanTask.success();
      onPlanLaunched(createPlanResult.id);
    } catch (err) {
      startPlanTask.error();
      startPlanTask.setMessage(err.message);
    }
  }, [onPlanLaunched, planState, startPlanTask]);

  return (
    <Grid
      container
      direction="column"
      spacing={2}
      wrap="nowrap"
      data-testid="plan-editor">
      <Grid item>
        <TextField
          id="plan-name"
          label="Name"
          fullWidth
          value={planState.plan_name ?? ''}
          onChange={e => {
            updatePlanState({plan_name: e.target.value});
          }}
        />
      </Grid>
      <Grid item>
        <SelectANPFolder
          id="folderid"
          folderId={planState.folder_id}
          onChange={fId => updatePlanState({folder_id: fId})}
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
            Start Plan{' '}
            {startPlanTask.isLoading && <CircularProgress size={10} />}
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
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
