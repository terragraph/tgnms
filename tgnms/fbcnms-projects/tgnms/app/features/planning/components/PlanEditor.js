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
import ManageInputFile from './ManageInputFile';
import ManageSitesFile from './ManageSitesFile';
import SelectHardwareProfiles from './SelectHardwareProfiles';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {LAUNCHING_NETWORK_PLAN_STATES} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {debounce, isEmpty} from 'lodash';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';

import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {PlanFormState} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';

const useStyles = makeStyles(theme => ({
  error: {color: theme.palette.error.main},
}));

export default function PlanEditor({
  folderId,
  plan,
  onPlanUpdated,
  onPlanLaunched,
}: {
  plan: NetworkPlan,
  folderId: string,
  onPlanUpdated: NetworkPlan => void,
  onPlanLaunched: number => void | Promise<void>,
}) {
  const classes = useStyles();
  const [planState, setPlanFormState] = React.useState<$Shape<PlanFormState>>(
    {},
  );
  // reconstruct the form-state from plan and input files
  React.useEffect(() => {
    const formState: PlanFormState = {
      id: plan.id,
      name: plan?.name ?? '',
      dsm: plan.dsmFile,
      boundary: plan.boundaryFile,
      siteList: plan.sitesFile,
      hardwareBoardIds: plan.hardwareBoardIds,
    };
    setPlanFormState(formState);
  }, [plan, folderId, setPlanFormState]);
  const startPlanTask = useTaskState({
    initialState:
      // If a plan is still trying to launch, set the plan to loading.
      LAUNCHING_NETWORK_PLAN_STATES.has(plan.state) ? 'LOADING' : 'IDLE',
  });
  const savePlanTask = useTaskState();
  const onPlanUpdatedRef = useLiveRef(onPlanUpdated);
  const savePlan = React.useCallback(
    async (planState: PlanFormState) => {
      if (isEmpty(planState)) return;
      try {
        savePlanTask.setMessage(null);
        savePlanTask.loading();
        const {id, name, dsm, boundary, siteList, hardwareBoardIds} = planState;
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
          hardwareBoardIds: hardwareBoardIds,
        });
        onPlanUpdatedRef.current(updatedPlan);
        savePlanTask.success();
      } catch (err) {
        savePlanTask.error();
        savePlanTask.setMessage(err.message);
      }
    },
    [onPlanUpdatedRef, savePlanTask],
  );

  const savePlanDebounced = React.useMemo(() => debounce(savePlan, 500), [
    savePlan,
  ]);

  const updatePlanState = (update: $Shape<PlanFormState>) => {
    setPlanFormState(curr => {
      const state = {...curr, ...update};
      savePlanDebounced(state);
      return state;
    });
  };

  const handleStartPlanClicked = React.useCallback(async () => {
    try {
      startPlanTask.loading();
      const _launchPlanResult = await networkPlanningAPIUtil.launchPlan({
        id: plan.id,
      });
      onPlanLaunched(plan.id);
      startPlanTask.success();
    } catch (err) {
      startPlanTask.error();
      if (err.response?.data?.errors != null) {
        startPlanTask.setMessage(
          `Plan failed to launch: ${err.response.data.errors.join('\n')}`,
        );
      } else {
        startPlanTask.setMessage(err.message);
      }
    }
  }, [onPlanLaunched, plan, startPlanTask]);

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
          label="Plan Name"
          fullWidth
          error={planState.name == ''}
          helperText={planState.name == '' ? 'Plan name is required.' : ''}
          value={planState.name ?? ''}
          onChange={e => {
            updatePlanState({name: e.target.value});
          }}
        />
      </Grid>
      <Grid item>
        <ManageInputFile
          id="select-dsm-file"
          label="DSM File"
          fileTypes=".tif"
          role={FILE_ROLE.DSM_GEOTIFF}
          initialValue={planState.dsm}
          onChange={f => updatePlanState({dsm: f})}
        />
      </Grid>
      <Grid item>
        <ManageSitesFile
          id="select-sites-file"
          initialValue={planState.siteList}
          onChange={f => updatePlanState({siteList: f})}
        />
      </Grid>
      <Grid item>
        <ManageInputFile
          id="select-boundary-file"
          label="Boundary File"
          fileTypes=".kml"
          role={FILE_ROLE.BOUNDARY_FILE}
          initialValue={planState.boundary}
          onChange={f => updatePlanState({boundary: f})}
        />
      </Grid>
      <Grid item>
        <SelectHardwareProfiles
          id="select-hardware-profiles"
          onChange={ids => {
            updatePlanState({hardwareBoardIds: ids});
          }}
          initialProfiles={plan.hardwareBoardIds}
        />
      </Grid>
      {!startPlanTask.isLoading && (
        <Grid item container justifyContent="flex-end" spacing={1}>
          <Grid item>
            {savePlanTask.isLoading && <CircularProgress size={10} />}
            <Typography className={classes.error} variant="caption">
              {savePlanTask.message}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              disabled={!validateSubmitPlan(planState)}
              onClick={handleStartPlanClicked}
              variant="contained"
              color="primary"
              size="small">
              Create Plan
            </Button>
          </Grid>
        </Grid>
      )}
      {startPlanTask.isLoading && (
        <Grid container justifyContent="center">
          <CircularProgress data-testid="launch-loading-circle" size={20} />
        </Grid>
      )}
      {startPlanTask.isError && (
        <Grid item>
          <Typography className={classes.error} variant="caption">
            {startPlanTask.message}
          </Typography>
        </Grid>
      )}
    </Grid>
  );
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
