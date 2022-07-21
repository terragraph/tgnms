/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */
import * as turf from '@turf/turf';
import ActionsMenu from '../ActionsMenu/ActionsMenu';
import Alert from '@material-ui/lab/Alert';
import AnnotationGroupsForm from './AnnotationGroupsForm';
import Box from '@material-ui/core/Box';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import EditAnnotationForm from './EditAnnotationForm';
import Grid from '@material-ui/core/Grid';
import Measurement from './Measurement';
import React from 'react';
import Slide from '@material-ui/core/Slide';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {
  GEOMETRY_TYPE,
  POINTS,
} from '@fbcnms/tg-nms/app/constants/GeoJSONConstants';
import {GEO_GEOM_TYPE_TITLES} from '@fbcnms/tg-nms/app/constants/MapAnnotationConstants';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {makeStyles} from '@material-ui/styles';
import {
  useAnnotationFeatures,
  useMapAnnotationContext,
} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from '@fbcnms/tg-nms/app/hooks/useSnackbar';

import type {GeoFeature} from '@turf/turf';
import type {
  LinkType,
  NodeType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {PanelStateControl} from '@fbcnms/tg-nms/app/features/map/usePanelControl';

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
    selectedFeatures,
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
        title={getPanelTitle(selectedFeatures)}
        data-testid="annotations-panel"
        details={
          <Grid container direction="column" wrap="nowrap">
            {selectedFeatures.length < 1 && (
              <>
                <AnnotationGroupsForm />
                <Divider />
              </>
            )}
            {selectedFeatures.length >= 1 && (
              <>
                {selectedFeatures.map(feature => (
                  <AnnotationCard feature={feature} key={feature.id} />
                ))}
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

function getPanelTitle(features: Array<GeoFeature>) {
  if (features.length === 1) {
    const feature = features[0];
    const type = turf.getType(feature);
    if (typeof GEO_GEOM_TYPE_TITLES[type] === 'string') {
      return GEO_GEOM_TYPE_TITLES[type];
    } else {
      return type;
    }
  } else if (features.length > 1) {
    return 'Multiple';
  }

  return 'Annotation Layers';
}

/**
 * annotation card's internal spacing adds some negative margin on
 * both sides which throws off alignment with the rest of CustomAccordion.
 */
const formSpacing = 1;
const wrapperPadding = formSpacing / 2.0;
const useAnnotationCardStyles = makeStyles(theme => ({
  cardWrapper: {
    //padding to counteract negative margin
    padding: theme.spacing(wrapperPadding),
    marginBottom: theme.spacing(1),
  },
  card: {
    backgroundColor: theme.palette.grey[100],
    // regular padding for the form itself
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
  },
}));
function AnnotationCard({feature}: {feature: GeoFeature}) {
  const classes = useAnnotationCardStyles();
  return (
    <Grid item container className={classes.cardWrapper}>
      <Grid
        className={classes.card}
        item
        container
        direction="column"
        spacing={formSpacing}
        wrap="nowrap">
        <EditAnnotationForm feature={feature} />
        <Measurement feature={feature} />
      </Grid>
    </Grid>
  );
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
  const {selectedFeatures} = useMapAnnotationContext();
  const {deleteFeature} = useAnnotationFeatures();
  const snackbars = useSnackbars();

  const handleConvertToSite = async () => {
    reset();
    // flatten the error list
    const errors = [].concat.apply(
      [],
      selectedFeatures.map(f => validateFeature(f)),
    );
    if (errors.length > 0) {
      setState(TASK_STATE.ERROR);
      setMessage(errors.join());
    } else {
      setState(TASK_STATE.LOADING);
      const createdTopology = convertFeaturesToTopology(selectedFeatures);
      try {
        await apiRequest({
          networkName,
          endpoint: 'bulkAdd',
          data: createdTopology,
        });
        for (const f of selectedFeatures) {
          await deleteFeature(f.id);
        }
        setState(TASK_STATE.SUCCESS);
        snackbars.success(
          'Topology successfully changed! Please wait a few moments for the topology to update.',
        );
      } catch (err) {
        setState(TASK_STATE.ERROR);
        setMessage(err.message);
      }
    }
  };

  const handleDelete = React.useCallback(async () => {
    for (const f of selectedFeatures) {
      await deleteFeature(f.id);
    }
  }, [deleteFeature, selectedFeatures]);

  // Disable quick convert if selection is not all points
  const isNonPointSelected = selectedFeatures.some(
    f => f?.geometry?.type !== GEOMETRY_TYPE.POINT,
  );
  const actions = [
    {
      heading: 'Topology',
      isDisabled: isNonPointSelected,
      actions: [
        {
          label: 'Quick-Convert to Site',
          func: handleConvertToSite,
          isDisabled: isNonPointSelected,
          'data-testid': 'quick-convert-to-site',
        },
      ],
    },
    {
      heading: 'Annotation',
      actions: [
        {
          label: 'Delete',
          func: handleDelete,
          'data-testid': 'delete-annotation',
        },
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
function convertFeaturesToTopology(
  features: Array<GeoFeature>,
): $Shape<BulkAddTopologyType> {
  const topology = {sites: [], nodes: [], links: []};
  for (const feature of features) {
    const type = turf.getType(feature);
    if (POINTS.has(type)) {
      topology.sites.push(convertPointToSite(feature));
    }
  }

  return topology;
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
