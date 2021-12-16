/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Alert from '@material-ui/lab/Alert';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import React from 'react';
import SelectANPFolder from '@fbcnms/tg-nms/app/features/planning/components/SelectANPFolder';
import SelectANPPlan from '@fbcnms/tg-nms/app/features/planning/components/SelectANPPlan';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import {suggestVersionedName} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {
  useFolderPlans,
  usePlanningFolderId,
} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
type Props = {|
  isOpen: boolean,
  onClose: () => void,
  onComplete?: () => void,
  folderId?: string,
|};

const PARAM_SOURCE = {
  NEW: 'NEW',
  COPY_EXISTING: 'COPY_EXISTING',
};
type CreateNetworkPlanFormState = {|
  folderId: string,
  planName: string,
  paramSource: $Keys<typeof PARAM_SOURCE>,
  paramSourceId: ?string,
|};

const useStyles = makeStyles(theme => ({
  errorHelperText: {
    color: theme.palette.error.light,
  },
}));
export default function CreatePlanModal({
  isOpen,
  onClose,
  onComplete,
  folderId,
}: Props) {
  const classes = useStyles();
  const taskState = useTaskState();
  const _folderId = usePlanningFolderId();
  const {setSelectedPlanId} = useNetworkPlanningContext();
  const {
    formState,
    handleInputChange,
    updateFormState,
  } = useForm<CreateNetworkPlanFormState>({
    initialState: {
      folderId: folderId || _folderId,
      paramSource: PARAM_SOURCE.NEW,
      paramSourceId: null,
    },
  });
  const updateFormStateRef = React.useRef(updateFormState);
  updateFormStateRef.current = updateFormState;
  const {paramSourceId} = formState;

  const {plans} = useFolderPlans({folderId: formState.folderId});
  const handleSubmitClick = React.useCallback(async () => {
    try {
      taskState.reset();
      if (!validate(formState)) {
        throw new Error('Please fill all required fields');
      }
      taskState.loading();
      let requestParams = {
        name: formState.planName,
        folderId: parseInt(formState.folderId),
      };
      // Copy input files if copying an existing plan.
      if (formState?.paramSourceId) {
        const plan = await networkPlanningAPIUtil.getPlan({
          id: formState?.paramSourceId,
        });
        requestParams = {
          ...requestParams,
          dsmFileId: plan?.dsmFile?.id,
          boundaryFileId: plan?.boundaryFile?.id,
          sitesFileId: plan?.sitesFile?.id,
        };
      }
      const createdPlan = await networkPlanningAPIUtil.createPlan(
        requestParams,
      );
      setSelectedPlanId(createdPlan.id);
      taskState.success();
      if (onComplete) {
        onComplete();
      }
      onClose();
    } catch (err) {
      taskState.setMessage(err.message);
      taskState.error();
    }
  }, [formState, setSelectedPlanId, taskState, onComplete, onClose]);
  React.useEffect(() => {
    if (!isNullOrEmptyString(paramSourceId) && plans != null) {
      const basePlan = plans.find(x => x.id === paramSourceId);
      if (basePlan != null) {
        updateFormStateRef.current({
          planName: suggestVersionedName(basePlan.name),
        });
      }
    }
  }, [paramSourceId, plans, updateFormStateRef]);
  React.useEffect(() => {
    if (!isOpen) {
      taskState.reset();
    }
  }, [taskState, isOpen]);
  return (
    <MaterialModal
      open={isOpen}
      onClose={onClose}
      modalTitle={'Add Plan'}
      modalContent={
        <Grid
          container
          direction="column"
          spacing={3}
          data-testid="create-plan-modal">
          {taskState.isSuccess && (
            <Alert color="success" severity="success">
              <Typography>Plan created</Typography>
            </Alert>
          )}
          {taskState.isError && (
            <Alert color="error" severity="error">
              <Grid item container direction="column">
                <Grid item>
                  <Typography>Creating Plan failed</Typography>
                </Grid>
                {taskState.message && (
                  <Grid item>
                    <Typography>{taskState.message}</Typography>
                  </Grid>
                )}{' '}
              </Grid>
            </Alert>
          )}
          <Grid item xs={12}>
            <FormLabel htmlFor="folderId">Project</FormLabel>
            <SelectANPFolder
              folderId={formState.folderId}
              onChange={fId => {
                updateFormState({folderId: fId});
              }}
              id="folderId"
              hideLabel={true}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Parameters</FormLabel>
              <FormHelperText>
                You can add a plan using new parameters or by copying an
                existing plan's parameters
              </FormHelperText>
              <RadioGroup
                aria-label="Copy plan parameters?"
                name="plan_copy_parameters"
                value={formState.paramSource}
                onChange={e =>
                  updateFormState({
                    paramSource: e.target.value,
                    // Ensure we don't accidentally copy a plan.
                    paramSourceId: null,
                  })
                }
                row>
                <FormControlLabel
                  value={PARAM_SOURCE.NEW}
                  control={<Radio size="small" />}
                  label="Create New"
                />
                <FormControlLabel
                  value={PARAM_SOURCE.COPY_EXISTING}
                  control={<Radio size="small" />}
                  label="Copy Existing"
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          {formState.paramSource === PARAM_SOURCE.COPY_EXISTING && (
            <Grid item xs={12} style={{paddingTop: 0}}>
              {isNullOrEmptyString(formState.folderId) && (
                <FormHelperText classes={{root: classes.errorHelperText}}>
                  Please select a project first
                </FormHelperText>
              )}
              <FormLabel htmlFor="paramSourceID">Plan</FormLabel>
              <SelectANPPlan
                folderId={formState.folderId}
                planId={formState.paramSourceId}
                onChange={id => {
                  updateFormState({paramSourceId: id});
                }}
                disabled={isNullOrEmptyString(formState.folderId)}
                id="paramSourceId"
                hideLabel={true}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              id="planName"
              onChange={handleInputChange(x => ({planName: x}))}
              value={formState.planName}
              label="Plan Name"
              disabled={taskState.isLoading}
              fullWidth
            />
          </Grid>
        </Grid>
      }
      modalActions={
        <>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button
            disabled={!validate(formState)}
            color="primary"
            onClick={handleSubmitClick}
            variant="contained">
            Continue{' '}
            {taskState.isLoading && (
              <CircularProgress size={10} style={{marginLeft: 5}} />
            )}
          </Button>
        </>
      }
    />
  );
}

function validate(plan: CreateNetworkPlanFormState) {
  return (
    !isNullOrEmptyString(plan.planName) && !isNullOrEmptyString(plan.folderId)
  );
}
