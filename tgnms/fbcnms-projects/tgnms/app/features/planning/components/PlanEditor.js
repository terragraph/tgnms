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
import SelectOrUploadInputFile from './SelectOrUploadInputFile';
import TextField from '@material-ui/core/TextField';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {usePlanFormState} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {PlanFormState} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';

export default function PlanEditor({
  folderId,
  plan,
  onExit,
  onPlanUpdated,
  onPlanLaunched,
}: {
  plan: NetworkPlan,
  folderId: string,
  onExit: () => void,
  onPlanUpdated: NetworkPlan => void,
  onPlanLaunched: number => void | Promise<void>,
}) {
  const snackbars = useSnackbars();
  // reconstruct the form-state from plan and input files
  const {planState, updatePlanState, setPlanFormState} = usePlanFormState();
  React.useEffect(() => {
    const formState: PlanFormState = {
      id: plan.id,
      name: plan?.name ?? '',
      dsm: plan.dsmFile,
      boundary: plan.boundaryFile,
      siteList: plan.sitesFile,
    };
    setPlanFormState(formState);
  }, [plan, folderId, setPlanFormState]);
  const startPlanTask = useTaskState();
  const savePlanTask = useTaskState();
  const savePlan = React.useCallback(async () => {
    const {id, name, dsm, boundary, siteList} = planState;
    for (const f of [dsm, boundary, siteList]) {
      if (f == null) {
        continue;
      }
      if (f.id == null) {
        const file = await networkPlanningAPIUtil.createInputFile({
          ...f,
        });
        f.id = file.id;
      }
    }
    const updatedPlan = await networkPlanningAPIUtil.updatePlan({
      id,
      name,
      dsmFileId: dsm?.id,
      boundaryFileId: boundary?.id,
      sitesFileId: siteList?.id,
    });
    onPlanUpdated(updatedPlan);
  }, [planState, onPlanUpdated]);

  const handleSavePlanClicked = React.useCallback(async () => {
    try {
      savePlanTask.loading();
      await savePlan();
      savePlanTask.success();
      snackbars.success('Successfully saved plan.');
    } catch (err) {
      savePlanTask.error();
      savePlanTask.setMessage(err.message);
      snackbars.error(`An issue occured while saving the plan: ${err.message}`);
    }
  }, [savePlan, savePlanTask, snackbars]);
  const handleStartPlanClicked = React.useCallback(async () => {
    try {
      startPlanTask.loading();
      await savePlan();
      const _launchPlanResult = await networkPlanningAPIUtil.launchPlan({
        id: plan.id,
      });
      onPlanLaunched(plan.id);
      startPlanTask.success();
    } catch (err) {
      startPlanTask.error();
      startPlanTask.setMessage(err.message);
    }
  }, [onPlanLaunched, plan, startPlanTask, savePlan]);

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
          value={planState.name ?? ''}
          onChange={e => {
            updatePlanState({name: e.target.value});
          }}
        />
      </Grid>

      <SelectOrUploadInputFile
        id="select-dsm-file"
        label="DSM File"
        fileTypes=".tif"
        role={FILE_ROLE.DSM_GEOTIFF}
        initialValue={planState.dsm ?? null}
        onChange={f => updatePlanState({dsm: f})}
      />
      <SelectOrUploadInputFile
        id="select-sites-file"
        label="Sites File"
        fileTypes=".csv"
        role={FILE_ROLE.URBAN_SITE_FILE}
        initialValue={planState.siteList ?? null}
        onChange={f => updatePlanState({siteList: f})}
      />
      <SelectOrUploadInputFile
        id="select-boundary-file"
        label="Boundary File"
        fileTypes=".kml"
        role={FILE_ROLE.BOUNDARY_FILE}
        initialValue={planState.boundary ?? null}
        onChange={f => updatePlanState({boundary: f})}
      />
      {!startPlanTask.isLoading && (
        <Grid item container justify="flex-end" spacing={1}>
          <Grid item>
            <Button onClick={onExit} variant="outlined" size="small">
              Cancel
            </Button>
          </Grid>
          <Grid item>
            <Button
              disabled={!validateSavePlan(planState) || savePlanTask.isLoading}
              onClick={handleSavePlanClicked}
              variant="contained"
              color="primary"
              size="small">
              Save Plan{'   '}
              {savePlanTask.isLoading && <CircularProgress size={10} />}
            </Button>
          </Grid>
          <Grid item>
            <Button
              disabled={!validateSubmitPlan(planState)}
              onClick={handleStartPlanClicked}
              variant="contained"
              color="primary"
              size="small">
              Start Plan
            </Button>
          </Grid>
        </Grid>
      )}
      {startPlanTask.isLoading && (
        <Grid container justify="center">
          <CircularProgress size={20} />
        </Grid>
      )}
    </Grid>
  );
}

function validateSavePlan(state: $Shape<PlanFormState>): boolean {
  try {
    if (!state) {
      return false;
    }
    const {name} = state;
    if (isNullOrEmptyString(name)) {
      return false;
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
function validateSubmitPlan(state: $Shape<PlanFormState>): boolean {
  try {
    if (!state) {
      return false;
    }
    const {name, boundary, dsm, siteList} = state;
    if (
      isNullOrEmptyString(name) ||
      boundary == null ||
      dsm == null ||
      siteList == null
    ) {
      return false;
    }
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
