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
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Grid from '@material-ui/core/Grid';
import PlanResultsView from './PlanResultsView';
import SelectOrUploadANPFile from './SelectOrUploadANPFile';
import Slide from '@material-ui/core/Slide';
import TextField from '@material-ui/core/TextField';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {FILE_ROLE, PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/views/map/usePanelControl';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import type {
  ANPPlan,
  AnpFileHandle,
  CreateANPPlanRequest,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/views/map/usePanelControl';

export type InputFilesByRole = {|[role: string]: AnpFileHandle|};

export default function NetworkPlanningPanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {getIsHidden, getIsOpen, toggleOpen, setPanelState} = panelControl;
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
  const {setMapMode} = useMapContext();

  // open the panel whenever a plan is selected
  React.useEffect(() => {
    if (selectedPlanId != null) {
      setPanelState(PANELS.NETWORK_PLANNING, PANEL_STATE.OPEN);
      setMapMode(MAPMODE.PLANNING);
    }
  }, [setPanelState, selectedPlanId, setMapMode]);
  // when the panel is closed, deselect the plan
  const closePanel = React.useCallback(() => {
    setPanelState(PANELS.NETWORK_PLANNING, PANEL_STATE.HIDDEN);
    setSelectedPlanId(null);
    setMapMode(MAPMODE.DEFAULT);
  }, [setPanelState, setSelectedPlanId, setMapMode]);
  return (
    <Slide
      {...SlideProps}
      unmountOnExit
      in={!getIsHidden(PANELS.NETWORK_PLANNING)}>
      <CustomAccordion
        title="Network Planning"
        data-testid="network-planning-panel"
        details={<NetworkPlanForm onExit={closePanel} />}
        expanded={getIsOpen(PANELS.NETWORK_PLANNING)}
        onChange={() => toggleOpen(PANELS.NETWORK_PLANNING)}
        onClose={closePanel}
      />
    </Slide>
  );
}

function NetworkPlanForm({onExit}: {onExit: () => void}) {
  const {selectedPlanId} = useNetworkPlanningContext();
  //TODO move to context, provide a getPlan which caches based on id?
  const [plan, setPlan] = React.useState<?ANPPlan>();
  // the plan is immutable once it is launched
  const isViewResultsMode =
    !isNullOrEmptyString(selectedPlanId) &&
    plan?.plan_status !== PLAN_STATUS.IN_PREPARATION;

  const {planState, updatePlanState, setPlanFormState} = useCreatePlanState();
  const {
    state: loadPlanTaskState,
    setState: setLoadPlanTaskState,
  } = useTaskState();
  const [
    planInputFiles,
    setPlanInputFiles,
  ] = React.useState<?InputFilesByRole>();
  // If a plan is selected, load it from the API and hydrate the form
  React.useEffect(() => {
    (async () => {
      if (selectedPlanId) {
        try {
          setLoadPlanTaskState(TASK_STATE.LOADING);
          // load basic plan data and its input files
          const plan = await networkPlanningAPIUtil.getPlan({
            id: selectedPlanId,
          });
          const inputFiles = await networkPlanningAPIUtil.getPlanInputFiles({
            id: selectedPlanId,
          });

          const filesByRole = indexFilesByRole(inputFiles);
          setPlanInputFiles(filesByRole);
          // reconstruct the form state from plan and input files
          const formState: CreateANPPlanRequest = {
            dsm: filesByRole[FILE_ROLE.DSM_GEOTIFF]?.id,
            folder_id: '',
            plan_name: plan.plan_name,
            boundary_polygon: filesByRole[FILE_ROLE.BOUNDARY_FILE]?.id,
            site_list: filesByRole[FILE_ROLE.URBAN_SITE_FILE]?.id,
          };
          setPlan(plan);
          setPlanFormState(formState);
          setLoadPlanTaskState(TASK_STATE.SUCCESS);
        } catch (err) {
          setLoadPlanTaskState(TASK_STATE.ERROR);
        }
      }
    })();
  }, [selectedPlanId, setPlanFormState, setLoadPlanTaskState]);

  const handleStartPlanClicked = React.useCallback(async () => {
    if (!validatePlanState(planState)) {
      return;
    }
    const createPlanResult = await networkPlanningAPIUtil.createPlan({
      ...planState,
    });
    const _launchPlanResult = await networkPlanningAPIUtil.launchPlan({
      id: createPlanResult.id,
    });
  }, [planState]);

  if (loadPlanTaskState === TASK_STATE.LOADING) {
    return (
      <Grid container justify="center">
        <CircularProgress size={25} />
      </Grid>
    );
  }
  if (isViewResultsMode) {
    return <PlanResultsView plan={plan} inputFiles={planInputFiles} />;
  }
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
        initialValue={
          planInputFiles ? planInputFiles[FILE_ROLE.DSM_GEOTIFF] : null
        }
        onChange={f => updatePlanState({dsm: f.id})}
      />
      <SelectOrUploadANPFile
        label="Select Sites File"
        fileTypes=".csv"
        role={FILE_ROLE.URBAN_SITE_FILE}
        initialValue={
          planInputFiles ? planInputFiles[FILE_ROLE.URBAN_SITE_FILE] : null
        }
        onChange={f => updatePlanState({site_list: f.id})}
      />
      <SelectOrUploadANPFile
        label="Select Boundary File"
        fileTypes=".kml,.kmz"
        role={FILE_ROLE.BOUNDARY_FILE}
        initialValue={
          planInputFiles ? planInputFiles[FILE_ROLE.BOUNDARY_FILE] : null
        }
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

function useCreatePlanState(): {|
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

function indexFilesByRole(files: Array<AnpFileHandle>) {
  const filesByRole = files.reduce<{
    [role: string]: AnpFileHandle,
  }>((map, file) => {
    map[file.file_role] = file;
    return map;
  }, {});
  return filesByRole;
}
