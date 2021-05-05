/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import CircularProgress from '@material-ui/core/CircularProgress';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Grid from '@material-ui/core/Grid';
import PlanEditor from '@fbcnms/tg-nms/app/features/planning/components/PlanEditor';
import PlanResultsView from '@fbcnms/tg-nms/app/features/planning/components/PlanResultsView';
import Slide from '@material-ui/core/Slide';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  isFinalState,
  suggestVersionedName,
} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useInterval} from '@fbcnms/ui/hooks';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {usePlanningFolderId} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';

import type {ANPFileHandle, ANPPlan} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {InputFilesByRole} from '@fbcnms/tg-nms/app/features/planning/components/PlanEditor';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

export default function NetworkPlanningPanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {
    getIsHidden,
    getIsOpen,
    toggleOpen,
    collapseAll,
    setPanelState,
  } = panelControl;
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
  const {setMapMode} = useMapContext();

  // when the panel is closed, deselect the plan
  const closePanel = React.useCallback(() => {
    setPanelState(PANELS.NETWORK_PLANNING, PANEL_STATE.HIDDEN);
    setSelectedPlanId(null);
    setMapMode(MAPMODE.DEFAULT);
  }, [setPanelState, setSelectedPlanId, setMapMode]);

  // open the panel whenever a plan is selected
  React.useEffect(() => {
    if (selectedPlanId != null) {
      collapseAll();
      setPanelState(PANELS.NETWORK_PLANNING, PANEL_STATE.OPEN);
      setMapMode(MAPMODE.PLANNING);
    }
    if (selectedPlanId == null && getIsOpen(PANELS.NETWORK_PLANNING)) {
      closePanel();
    }
  }, [
    setPanelState,
    selectedPlanId,
    setMapMode,
    collapseAll,
    getIsOpen,
    closePanel,
  ]);

  return (
    <Slide
      {...SlideProps}
      unmountOnExit
      in={!getIsHidden(PANELS.NETWORK_PLANNING)}>
      <CustomAccordion
        title="Network Planning"
        data-testid="network-planning-panel"
        details={<NetworkPlanningPanelDetails onExit={closePanel} />}
        expanded={getIsOpen(PANELS.NETWORK_PLANNING)}
        onChange={() => toggleOpen(PANELS.NETWORK_PLANNING)}
        onClose={closePanel}
      />
    </Slide>
  );
}

function NetworkPlanningPanelDetails({onExit}: {onExit: () => void}) {
  const folderId = usePlanningFolderId();
  const {selectedPlanId, setSelectedPlanId} = useNetworkPlanningContext();
  const [plan, setPlan] = React.useState<?ANPPlan>();
  // the plan is immutable once it is launched
  const isViewResultsMode =
    !isNullOrEmptyString(selectedPlanId) &&
    plan?.plan_status !== PLAN_STATUS.IN_PREPARATION;
  const {
    state: loadPlanTaskState,
    setState: setLoadPlanTaskState,
  } = useTaskState();
  const [
    planInputFiles,
    setPlanInputFiles,
  ] = React.useState<?InputFilesByRole>();
  const [refreshDate, setRefreshDate] = React.useState(new Date().getTime());
  const refresh = () => setRefreshDate(new Date().getTime());
  // If a plan is selected, load it from the API and hydrate the form
  React.useEffect(() => {
    (async () => {
      if (!isNullOrEmptyString(selectedPlanId)) {
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
          setPlan(plan);
          setLoadPlanTaskState(TASK_STATE.SUCCESS);
        } catch (err) {
          setLoadPlanTaskState(TASK_STATE.ERROR);
        }
      }
    })();
  }, [selectedPlanId, setLoadPlanTaskState, refreshDate]);
  useInterval(() => {
    if (plan != null && !isFinalState(plan?.plan_status)) {
      refresh();
    }
  }, 5000);
  const handlePlanLaunched = React.useCallback(
    (planId: string) => {
      setPlan(null); //null out the old plan and select a new one
      setSelectedPlanId(planId);
    },
    [setSelectedPlanId],
  );

  const handleCopyPlan = React.useCallback(() => {
    setSelectedPlanId('');
    // remove the ID from the cached plan and rename
    setPlan(curr => {
      if (curr == null) {
        return curr;
      }
      const {id: _, ...planParams} = curr;
      const suggestedName = suggestVersionedName(planParams.plan_name);
      if (suggestedName != null) {
        planParams.plan_name = suggestedName;
      }
      return {
        ...planParams,
        id: '',
        plan_name: suggestedName ?? planParams.plan_name,
      };
    });
  }, [setSelectedPlanId, setPlan]);

  if (
    loadPlanTaskState === TASK_STATE.LOADING &&
    (plan == null || planInputFiles == null)
  ) {
    return (
      <Grid container justify="center">
        <CircularProgress size={25} />
      </Grid>
    );
  }
  if (isViewResultsMode) {
    return (
      <PlanResultsView
        plan={plan}
        inputFiles={planInputFiles}
        onExit={onExit}
        onCopyPlan={handleCopyPlan}
      />
    );
  }
  return (
    <PlanEditor
      folderId={folderId}
      plan={plan}
      inputFiles={planInputFiles}
      onExit={onExit}
      onPlanLaunched={handlePlanLaunched}
    />
  );
}

function indexFilesByRole(files: Array<ANPFileHandle>): InputFilesByRole {
  const filesByRole = files.reduce<InputFilesByRole>((map, file) => {
    map[file.file_role] = file;
    return map;
  }, {});
  return filesByRole;
}
