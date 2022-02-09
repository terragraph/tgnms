/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import * as turf from '@turf/turf';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import MapIcon from '@material-ui/icons/Map';
import PlanErrors from './PlanErrors';
import PlanInputs from './PlanInputs';
import PlanKPIView from './PlanKPIView';
import PlanMultiSelectionView from './PlanMultiSelectionView';
import PlanOutputs from './PlanOutputs';
import PlanSingleSelectionView from './PlanSingleSelectionView';
import PlanStatus from './PlanStatus';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import UploadTopologyConfirmationModal from '@fbcnms/tg-nms/app/views/map/mappanels/UploadTopologyConfirmationModal';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import useUnmount from '@fbcnms/tg-nms/app/hooks/useUnmount';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {
  handleTopologyChangeSnackbar,
  uploadTopologyBuilderRequest,
} from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
import {isEmpty} from 'lodash';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {makeLinkName} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {planToMapFeatures} from '@fbcnms/tg-nms/app/helpers/MapLayerHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useNetworkPlanningContext} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import type {MapOptionsState} from '@fbcnms/tg-nms/app/features/planning/PlanningHelpers';
import type {NetworkPlan} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {SiteFeature} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

const useStyles = makeStyles(theme => ({
  cancelButton: {
    color: theme.palette.error.main,
  },
}));
export type Props = {|
  plan: ?NetworkPlan,
  onExit: () => void,
  onCopyPlan: () => void,
|};
export default function PlanResultsView({plan, onExit, onCopyPlan}: Props) {
  const classes = useStyles();
  const {networkName} = useNetworkContext();
  const {
    filteredTopology,
    getTopologyToCommit,
    setPendingTopology,
    pendingTopology,
    pendingTopologyCount,
  } = useNetworkPlanningManager();
  const {
    mapFeatures,
    setMapFeatures,
    mapboxRef,
    setOverlayData,
  } = useMapContext();
  const [shouldZoomToBBox, setShouldZoomToBBox] = React.useState(false);
  const snackbars = useSnackbars();
  const {
    inputFiles,
    loadInputFilesTask,
    outputFiles,
    loadOutputFilesTask,
    downloadOutputTask,
    mapOptions,
    setMapOptions,
  } = useNetworkPlanningContext();

  // Get the filtered plan topology and convert into mapFeatures to be rendered.
  React.useEffect(() => {
    if (!isEmpty(filteredTopology)) {
      const features = planToMapFeatures(filteredTopology);
      setShouldZoomToBBox(true);
      /**
       * reindex links using tg's link naming scheme instead of
       * anp's unique linkid. overlayData depends on this
       */
      const linkLines = objectValuesTypesafe(filteredTopology.links).reduce(
        (map, link) => {
          const linkName = makeLinkName(link.rx_sector_id, link.tx_sector_id);
          map[linkName] = link;
          return map;
        },
        {},
      );
      setOverlayData({
        link_lines: linkLines,
        site_icons: filteredTopology.sites,
        nodes: filteredTopology.sectors,
      });
      setMapFeatures(features);

      // When component is exited, clear the pendingTopology
      return () => setPendingTopology({links: [], sites: []});
    }
  }, [
    filteredTopology,
    setShouldZoomToBBox,
    setMapFeatures,
    setOverlayData,
    setPendingTopology,
  ]);

  /**
   * only zoom to the plan's bbox once, after the plan has been
   * converted into map features.
   */
  React.useEffect(() => {
    if (shouldZoomToBBox && mapFeatures != null) {
      const bbox = getBBox(objectValuesTypesafe(mapFeatures.sites));
      if (bbox) {
        mapboxRef?.fitBounds(bbox);
        setShouldZoomToBBox(false);
      }
    }
  }, [shouldZoomToBBox, mapFeatures, mapboxRef]);

  useUnmount(() => {
    setMapFeatures({sites: {}, links: {}, nodes: {}});
  });

  const cancelPlanTask = useTaskState();
  const handleCancelPlan = React.useCallback(async () => {
    try {
      if (plan) {
        cancelPlanTask.loading();
        await networkPlanningAPIUtil.cancelPlan({id: plan.id});
        cancelPlanTask.success();
        onExit();
      }
    } catch (err) {
      cancelPlanTask.error();
    }
  }, [cancelPlanTask, onExit, plan]);

  const handleCommitPlan = React.useCallback(() => {
    const onClose = status => {
      if (status) {
        handleTopologyChangeSnackbar(status, snackbars);
      }
    };
    uploadTopologyBuilderRequest(getTopologyToCommit(), networkName, onClose);

    // Clear selection once request is sent.
    setPendingTopology({links: [], sites: []});
  }, [getTopologyToCommit, setPendingTopology, networkName, snackbars]);

  const ctaText = React.useMemo(() => {
    if (pendingTopologyCount == 1) {
      if (pendingTopology.links.size) {
        return 'Commit Link to Network';
      } else {
        return 'Commit Site to Network';
      }
    } else {
      return 'Commit Plan to Network';
    }
  }, [pendingTopology, pendingTopologyCount]);

  if (!plan) {
    return null;
  }
  /**
   * We will either show:
   *  1. single selection view
   *  2. multi selection view
   *  3. general plan results
   */
  return (
    <Grid
      container
      direction="column"
      spacing={2}
      wrap="nowrap"
      data-testid="plan-results">
      {pendingTopologyCount >= 1 && (
        <PendingTopologyViews pendingTopologyCount={pendingTopologyCount} />
      )}
      {pendingTopologyCount == 0 && (
        <>
          <Grid
            item
            container
            justifyContent="space-between"
            alignItems="center">
            <Typography color="textSecondary" variant="h6">
              {plan.name}
            </Typography>
            <PlanStatus state={plan.state} />
          </Grid>
          {plan.state === NETWORK_PLAN_STATE.SUCCESS && (
            <PlanKPIView planId={plan.id} />
          )}
          {plan.state === NETWORK_PLAN_STATE.ERROR && (
            <PlanErrors plan={plan} />
          )}
          <PlanMapOptions options={mapOptions} onChange={setMapOptions} />
          <Grid item>
            <Typography color="textSecondary">Input Files</Typography>
          </Grid>
          {inputFiles && <PlanInputs files={inputFiles} />}
          <Grid item>
            <Typography color="textSecondary">Output Files</Typography>
            {plan.state === NETWORK_PLAN_STATE.RUNNING && (
              <Typography variant="subtitle2" color="textSecondary">
                Plan in-progress
              </Typography>
            )}
          </Grid>
          {outputFiles && <PlanOutputs files={outputFiles} />}
          <Grid item>
            {plan.state === NETWORK_PLAN_STATE.RUNNING && (
              <Button
                fullWidth
                className={classes.cancelButton}
                disabled={cancelPlanTask.isLoading}
                onClick={handleCancelPlan}
                variant="text">
                Cancel Plan
                {cancelPlanTask.isLoading && <CircularProgress size={10} />}
              </Button>
            )}
            <Button fullWidth onClick={onCopyPlan} variant="text">
              Copy Plan
            </Button>
          </Grid>
        </>
      )}
      {plan.state === NETWORK_PLAN_STATE.SUCCESS && (
        <Grid item>
          <UploadTopologyConfirmationModal
            fullWidth
            disabled={false}
            onSubmit={handleCommitPlan}
            getUploadTopology={getTopologyToCommit}
            customText={ctaText}
          />
        </Grid>
      )}
      {(downloadOutputTask.isLoading ||
        loadOutputFilesTask.isLoading ||
        loadInputFilesTask.isLoading) && (
        <Grid item>
          <Grid container justifyContent="center">
            <CircularProgress size={10} />
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}

const useMapOptionsStyles = makeStyles(() => ({
  switchWrapper: {
    marginLeft: -6,
  },
}));

function PlanMapOptions({
  options,
  onChange,
}: {
  options: MapOptionsState,
  onChange: ((MapOptionsState => MapOptionsState) | MapOptionsState) => void,
}) {
  const {mapFeatures, mapboxRef} = useMapContext();
  const classes = useMapOptionsStyles();
  const handleOptionChange = React.useCallback(
    e => {
      const {name, checked} = e.target;
      onChange(curr => ({
        ...curr,
        enabledStatusTypes: {
          ...curr.enabledStatusTypes,
          [name]: checked,
        },
      }));
    },
    [onChange],
  );
  const handleFitPlanBounds = React.useCallback(() => {
    const bbox = getBBox(objectValuesTypesafe(mapFeatures.sites));
    if (bbox) {
      mapboxRef?.fitBounds(bbox);
    }
  }, [mapFeatures, mapboxRef]);
  return (
    <Grid item>
      <FormControl component="fieldset">
        <FormLabel component="legend">
          Map elements{' '}
          <IconButton
            size="small"
            title="Move map to plan"
            onClick={handleFitPlanBounds}>
            <MapIcon fontSize="small" />
          </IconButton>
        </FormLabel>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={options.enabledStatusTypes.PROPOSED}
                name="PROPOSED"
                onChange={handleOptionChange}
                size="small"
              />
            }
            label="Proposed topology"
            className={classes.switchWrapper}
          />
          <FormControlLabel
            control={
              <Switch
                checked={options.enabledStatusTypes.UNAVAILABLE}
                name="UNAVAILABLE"
                onChange={handleOptionChange}
                size="small"
              />
            }
            label="Unavailable topology"
            className={classes.switchWrapper}
          />
          <FormControlLabel
            control={
              <Switch
                checked={options.enabledStatusTypes.CANDIDATE}
                onChange={handleOptionChange}
                name="CANDIDATE"
                size="small"
              />
            }
            label="Candidate graph"
            className={classes.switchWrapper}
          />
        </FormGroup>
      </FormControl>
    </Grid>
  );
}

function PendingTopologyViews({
  pendingTopologyCount,
}: {
  pendingTopologyCount: number,
}) {
  return (
    <>
      {pendingTopologyCount == 1 && (
        <Grid item>
          <PlanSingleSelectionView />
        </Grid>
      )}
      {pendingTopologyCount > 1 && (
        <Grid item>
          <PlanMultiSelectionView />
        </Grid>
      )}
    </>
  );
}

function getBBox(sites: Array<SiteFeature>) {
  if (sites.length < 1) {
    return null;
  }
  const features = turf.featureCollection(
    sites.map(site => turf.point(locToPos(site.location))),
  );
  return turf.bbox(features);
}
