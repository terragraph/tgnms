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
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {PRELAUNCH_NETWORK_PLAN_STATES} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {
  copyPlan,
  isLaunchedState,
} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import {isNullOrEmptyString} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {useInterval} from '@fbcnms/ui/hooks';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {usePlanningFolderId} from '@fbcnms/tg-nms/app/features/planning/PlanningHooks';
import type {ANPUploadTopologyType} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

/**
 * What happens when you click on a plan in the PlansTable:
 *
 * 1. Somewhere selectedPlanId has changed...
 * 2. Load plan from API and save to context.
 * 3. Load this new plan's input and output files from ANP.
 * 4. Download the "reporting graph" file from ANP and save it to
 *    the context as planTopology.
 *     - this will be used to create the map, table, and our
 *       pending topology. See `useNetworkPlanningManager` for more.
 */
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
  const {
    plan,
    setPlan,
    loadPlanTask,
    selectedPlanId,
    setSelectedPlanId,
    setRefreshDate,
    setPlanTopology,
    refreshDate,

    // I/O files
    setInputFiles,
    loadInputFilesTask,
    outputFiles,
    setOutputFiles,
    loadOutputFilesTask,
    downloadOutputTask,
  } = useNetworkPlanningContext();

  // 1. Somewhere selectedPlanId has changed...
  // 2. Load plan from API and save to context.
  React.useEffect(() => {
    (async () => {
      if (!isNullOrEmptyString(selectedPlanId)) {
        try {
          loadPlanTask.loading();
          // load basic plan data and its input files
          const plan = await networkPlanningAPIUtil.getPlan({
            id: selectedPlanId,
          });
          setPlan(plan);
          loadPlanTask.success();
        } catch (err) {
          loadPlanTask.error();
        }
      } else {
        loadPlanTask.loading();
        setPlan(null);
        loadPlanTask.success();
      }
    })();
  }, [setPlan, selectedPlanId, loadPlanTask, refreshDate]);

  // 3. Load this new plan's input and output files from ANP.
  React.useEffect(() => {
    (async () => {
      try {
        if (plan == null || PRELAUNCH_NETWORK_PLAN_STATES.has(plan.state)) {
          setInputFiles(null);
          return;
        }
        loadInputFilesTask.loading();
        const _inputFiles = await networkPlanningAPIUtil.getPlanInputFiles({
          id: plan.id.toString(),
        });
        setInputFiles(_inputFiles);
        loadInputFilesTask.success();
      } catch (err) {
        loadInputFilesTask.error();
      }
    })();
  }, [plan, loadInputFilesTask, setInputFiles]);

  React.useEffect(() => {
    (async () => {
      try {
        if (plan == null || PRELAUNCH_NETWORK_PLAN_STATES.has(plan.state)) {
          setOutputFiles(null);
          return;
        }
        loadOutputFilesTask.loading();
        const _outputFiles = await networkPlanningAPIUtil.getPlanOutputFiles({
          id: plan.id.toString(),
        });
        setOutputFiles(_outputFiles);
        loadOutputFilesTask.success();
      } catch (err) {
        loadOutputFilesTask.error();
      }
    })();
  }, [plan, loadOutputFilesTask, setOutputFiles]);

  // 4. Download the "reporting graph" file from ANP and save it to the context.
  React.useEffect(() => {
    (async () => {
      // Pick out the "reporting graph" file.
      const _reportingGraph = outputFiles?.find(
        f => f.file_role === FILE_ROLE.URBAN_TOPOLOGY_JSON,
      );
      try {
        if (_reportingGraph) {
          downloadOutputTask.loading();
          // eslint-disable-next-line max-len
          const fileData = await networkPlanningAPIUtil.downloadANPFile<ANPUploadTopologyType>(
            {
              id: _reportingGraph.id,
            },
          );

          setPlanTopology(fileData);
          downloadOutputTask.success();
        } else {
          setPlanTopology(null);
        }
      } catch (err) {
        console.error(err.message);
        downloadOutputTask.error();
      }
    })();
  }, [outputFiles, downloadOutputTask, setPlanTopology]);

  // the plan is immutable once it is launched
  const isViewResultsMode = React.useMemo(() => {
    return (
      !isNullOrEmptyString(selectedPlanId) &&
      plan != null &&
      !PRELAUNCH_NETWORK_PLAN_STATES.has(plan.state)
    );
  }, [selectedPlanId, plan]);

  const refresh = React.useCallback(
    () => setRefreshDate(new Date().getTime()),
    [setRefreshDate],
  );

  useInterval(() => {
    if (plan != null && isLaunchedState(plan?.state)) {
      refresh();
    }
  }, 5000);

  const handlePlanLaunched = React.useCallback(
    (_planId: number) => {
      refresh();
    },
    [refresh],
  );

  const handlePlanUpdated = React.useCallback(
    p => {
      setSelectedPlanId(p.id);
      setPlan(p);
    },
    [setPlan, setSelectedPlanId],
  );

  const handleCopyPlan = React.useCallback(() => {
    (async () => {
      setSelectedPlanId('');
      const newPlan = await copyPlan({plan, folderId});
      if (newPlan) setSelectedPlanId(newPlan.id);
    })();
  }, [setSelectedPlanId, plan, folderId]);

  if (loadPlanTask.isLoading && plan == null) {
    return (
      <Grid container justifyContent="center">
        <CircularProgress size={25} />
      </Grid>
    );
  }
  if (plan == null) {
    return null;
  }
  if (isViewResultsMode) {
    return (
      <PlanResultsView
        key={plan.id}
        plan={plan}
        onExit={onExit}
        onCopyPlan={handleCopyPlan}
      />
    );
  }
  return (
    <PlanEditor
      key={plan.id}
      folderId={folderId}
      plan={plan}
      onPlanLaunched={handlePlanLaunched}
      onPlanUpdated={handlePlanUpdated}
    />
  );
}
