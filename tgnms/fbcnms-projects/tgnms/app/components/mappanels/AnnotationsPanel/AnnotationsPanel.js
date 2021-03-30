/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as turf from '@turf/turf';
import ActionsMenu from '../ActionsMenu';
import Alert from '@material-ui/lab/Alert';
import AnnotationGroupsForm from './AnnotationGroupsForm';
import Box from '@material-ui/core/Box';
import CustomAccordion from '../../common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import EditAnnotationForm from './EditAnnotationForm';
import Grid from '@material-ui/core/Grid';
import Measurement from './Measurement';
import React from 'react';
import Slide from '@material-ui/core/Slide';
import useTaskState from '../../../hooks/useTaskState';
import {GEOMETRY_TYPE, POINTS} from '../../../constants/GeoJSONConstants';
import {GEO_GEOM_TYPE_TITLES} from '../../../constants/MapAnnotationConstants';
import {PANELS, PANEL_STATE} from '../../../views/map/usePanelControl';
import {SlideProps} from '../../../constants/MapPanelConstants';
import {apiRequest} from '../../../apiutils/ServiceAPIUtil';
import {
  useAnnotationFeatures,
  useMapAnnotationContext,
} from '../../../contexts/MapAnnotationContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';
import {useSnackbars} from '../../../hooks/useSnackbar';

import type {GeoFeature} from '@turf/turf';
import type {
  LinkType,
  NodeType,
  SiteType,
} from '../../../../shared/types/Topology';
import type {PanelStateControl} from '../../../views/map/usePanelControl';

export default function AnnotationsPanel({
  panelControl,
}: {
  panelControl: PanelStateControl,
}) {
  const {
    getIsHidden,
    getIsOpen,
    toggleOpen,
    setPanelState,
    collapseAll,
  } = panelControl;
  const {
    selectedFeatureId,
    selectedFeature,
    deselectAll,
    isDrawEnabled,
    setIsDrawEnabled,
  } = useMapAnnotationContext();
  const togglePanel = React.useCallback(() => toggleOpen(PANELS.ANNOTATIONS), [
    toggleOpen,
  ]);
  const handleClose = React.useCallback(() => {
    setIsDrawEnabled(false);
    deselectAll();
    setPanelState(PANELS.ANNOTATIONS, PANEL_STATE.HIDDEN);
  }, [setIsDrawEnabled, setPanelState, deselectAll]);

  React.useEffect(() => {
    if (isDrawEnabled) {
      collapseAll();
      setPanelState(PANELS.ANNOTATIONS, PANEL_STATE.OPEN);
    } else {
      setPanelState(PANELS.ANNOTATIONS, PANEL_STATE.HIDDEN);
    }
  }, [isDrawEnabled, setPanelState, collapseAll]);

  return (
    <Slide {...SlideProps} in={!getIsHidden(PANELS.ANNOTATIONS)}>
      <CustomAccordion
        title={getPanelTitle(selectedFeature)}
        data-testid="annotations-panel"
        details={
          <Grid container direction="column" spacing={2} wrap="nowrap">
            {!selectedFeatureId && (
              <>
                <AnnotationGroupsForm />
                <Divider />
              </>
            )}
            {selectedFeatureId && (
              <>
                <EditAnnotationForm />
                <Measurement />
                <Divider />
                <AnnotationsPanelActions />
              </>
            )}
          </Grid>
        }
        expanded={getIsOpen(PANELS.ANNOTATIONS)}
        onChange={togglePanel}
        onClose={handleClose}
      />
    </Slide>
  );
}

function getPanelTitle(feature: ?GeoFeature) {
  if (feature) {
    const type = turf.getType(feature);
    if (typeof GEO_GEOM_TYPE_TITLES[type] === 'string') {
      return GEO_GEOM_TYPE_TITLES[type];
    } else {
      return type;
    }
  }

  return 'Annotation Layers';
}

type ActionsProps = {||};
function AnnotationsPanelActions({}: ActionsProps) {
  const {
    isError,
    isSuccess,
    setState,
    reset,
    TASK_STATE,
    message,
    setMessage,
  } = useTaskState();
  const {networkName} = useNetworkContext();
  const {selectedFeature} = useMapAnnotationContext();
  const {deleteFeature} = useAnnotationFeatures();
  const snackbars = useSnackbars();

  const handleConvertToSite = async () => {
    reset();
    if (selectedFeature && selectedFeature) {
      const errors = validateFeature(selectedFeature);
      if (errors.length > 0) {
        setState(TASK_STATE.ERROR);
        setMessage(errors.join());
      } else {
        setState(TASK_STATE.LOADING);
        const createdTopology = convertFeatureToTopology(selectedFeature);
        try {
          await apiRequest({
            networkName,
            endpoint: 'bulkAdd',
            data: createdTopology,
          });
          await deleteFeature(selectedFeature.id);
          setState(TASK_STATE.SUCCESS);
          snackbars.success(
            'Topology successfully changed! Please wait a few moments for the topology to update.',
          );
        } catch (err) {
          setState(TASK_STATE.ERROR);
          setMessage(err.message);
        }
      }
    }
  };

  const handleDelete = React.useCallback(() => {
    deleteFeature(selectedFeature?.id);
  }, [deleteFeature, selectedFeature]);
  const actions = [
    {
      heading: 'Topology',
      isDisabled: selectedFeature?.geometry?.type !== GEOMETRY_TYPE.POINT,
      actions: [
        {
          label: 'Quick-Convert to Site',
          func: handleConvertToSite,
          isDisabled: selectedFeature?.geometry?.type !== GEOMETRY_TYPE.POINT,
          testId: 'quick-convert-to-site',
        },
      ],
    },
    {
      heading: 'Annotation',
      actions: [
        {label: 'Delete', func: handleDelete, testId: 'delete-annotation'},
      ],
    },
  ];
  return (
    <>
      {(isError || isSuccess) && (
        <Grid item xs={12}>
          <Box mx={-1}>
            {isError && (
              <Alert color="error" severity="error">
                {message}
              </Alert>
            )}
            {isSuccess && <Alert color="success">{message}</Alert>}
          </Box>
        </Grid>
      )}
      <ActionsMenu options={{actionItems: actions}} />
    </>
  );
}

type BulkAddTopologyType = {|
  sites: Array<SiteType>,
  links: Array<LinkType>,
  nodes: Array<NodeType>,
|};
function convertFeatureToTopology(
  feature: GeoFeature,
): $Shape<BulkAddTopologyType> {
  const type = turf.getType(feature);
  if (POINTS.has(type)) {
    return {sites: [convertPointToSite(feature)]};
  }
  return {sites: [], nodes: [], links: []};
}

function convertPointToSite(feature: GeoFeature): SiteType {
  const type = turf.getType(feature);
  if (type !== GEOMETRY_TYPE.POINT) {
    console.error(`Invalid type: ${type}`);
  }
  const [longitude, latitude] = turf.getCoord(feature);
  return {
    name: feature.properties.name,
    location: {
      latitude,
      longitude,
      altitude: 0,
      accuracy: 1000,
    },
  };
}

function validateFeature(feature: GeoFeature): Array<string> {
  const errs = [];
  const name = feature?.properties?.name;
  if (typeof name !== 'string' || name.trim() === '') {
    errs.push('Name is required');
  }
  return errs;
}
