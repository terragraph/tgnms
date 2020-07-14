/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as mapApiUtil from '../../../apiutils/MapAPIUtil';
import * as turf from '@turf/turf';
import CloseIcon from '@material-ui/icons/Close';
import EditIcon from '@material-ui/icons/Edit';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import React from 'react';
import ReactDOM from 'react-dom';
import useLiveRef from '../../../hooks/useLiveRef';
import useTaskState, {TASK_STATE} from '../../../hooks/useTaskState';
import {isFeatureEnabled} from '../../../constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '../../../contexts/MapContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';
import type {GeoFeatureCollection} from '@turf/turf';
import type {MapAnnotationGroup} from '../../../../shared/dto/MapAnnotations';

// for now, only use one annotation group
const ANNOTATION_DEFAULT_GROUP = 'default';

export const MAPBOX_DRAW_EVENTS = {
  CREATE: 'draw.create',
  DELETE: 'draw.delete',
  UPDATE: 'draw.update',
  SELECTION_CHANGE: 'draw.selectionchange',
};

export const MAPBOX_TG_EVENTS = {
  TOGGLE: 'tg.draw.toggle',
};

const useStyles = makeStyles(_theme => ({
  icon: {
    fontSize: '1rem',
  },
}));

export default function DrawLayer() {
  const classes = useStyles();
  const {isDrawEnabled, mapboxControl, mapboxRef} = useDrawLayer();
  if (!mapboxControl || !isFeatureEnabled('MAP_ANNOTATIONS_ENABLED')) {
    return null;
  }
  return ReactDOM.createPortal(
    <button
      style={
        !isDrawEnabled
          ? {
              backgroundColor: '#424242',
              color: 'white',
            }
          : undefined
      }
      title="Map Annotations"
      onClick={() => mapboxRef?.fire(MAPBOX_TG_EVENTS.TOGGLE, {})}
      data-testid="tg-draw-toggle">
      {isDrawEnabled ? (
        <CloseIcon className={classes.icon} />
      ) : (
        <EditIcon className={classes.icon} />
      )}
    </button>,
    mapboxControl,
  );
}

export function useDrawLayer() {
  const {networkName} = useNetworkContext();
  const {mapboxRef} = useMapContext();

  const [isDrawEnabled, setIsDrawEnabled] = React.useState(false);
  const drawControl = React.useMemo(
    () =>
      new MapboxDraw({
        userProperties: true,
        controls: {
          combine_features: false,
          uncombine_features: false,
        },
      }),
    [],
  );

  const {features: drawFeatures, updateFeatures} = useMapAnnotationGroupState({
    networkName,
    groupName: ANNOTATION_DEFAULT_GROUP,
  });

  const handleDrawUpdate = useLiveRef(_update => {
    const features = drawControl.getAll();
    updateFeatures(features);
  });

  const handleSelectionChange = useLiveRef(_selection => {
    //TODO: show side panel when feature is selected
  });

  const handleDrawToggle = useLiveRef(() => {
    const toggled = !isDrawEnabled;
    setIsDrawEnabled(toggled);
    if (toggled) {
      mapboxRef?.addControl(drawControl);
      drawControl.add(drawFeatures);
    } else {
      mapboxRef?.removeControl(drawControl);
    }
  });

  const mapboxControl = React.useMemo(() => {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    container.setAttribute('data-testid', 'tg-draw-toggle-container');
    return container;
  }, []);

  useOnceInitialized(() => {
    mapboxRef?.addControl({
      onAdd: _map => {
        return mapboxControl;
      },
      onRemove: () => {},
    });
    mapboxRef?.on(MAPBOX_TG_EVENTS.TOGGLE, (...args) =>
      handleDrawToggle.current(...args),
    );
    const handleMapboxEvent = event => handleDrawUpdate.current(event);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.CREATE, handleMapboxEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.DELETE, handleMapboxEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.UPDATE, handleMapboxEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.SELECTION_CHANGE, (...args) =>
      handleSelectionChange.current(...args),
    );
  }, [mapboxRef]);

  return {
    mapboxControl,
    mapboxRef,
    isDrawEnabled,
  };
}

function useOnceInitialized(fn: () => void | any, deps: Array<*>) {
  const fnRef = React.useRef(fn);
  React.useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  React.useEffect(
    () => {
      if (fnRef.current === null) {
        return;
      }
      // all deps have been initialized
      for (const d of deps) {
        if (typeof d === 'undefined' || d === null) {
          return;
        }
      }

      try {
        fnRef.current();
      } finally {
        fnRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
}

/**
 * Keeps the backend synced with the frontend
 */
export function useMapAnnotationGroupState({
  networkName,
  groupName,
}: {
  networkName: string,
  groupName: string,
}): {
  features: GeoFeatureCollection,
  updateFeatures: (
    features: GeoFeatureCollection,
  ) => Promise<MapAnnotationGroup>,
} {
  const [
    annotationGroup,
    setAnnotationGroup,
  ] = React.useState<?MapAnnotationGroup>(null);
  const {isLoading, isError} = useTaskState({
    initialState: TASK_STATE.LOADING,
  });
  const [features, setFeatures] = React.useState<GeoFeatureCollection>(
    turf.featureCollection([]),
  );

  const updateFeatures = React.useCallback(
    async (updated: GeoFeatureCollection) => {
      setFeatures(updated);
      const saved = await mapApiUtil.saveAnnotationGroup({
        networkName,
        group: {
          id: annotationGroup?.id,
          name: groupName,
          geojson: JSON.stringify(updated),
        },
      });
      return saved;
    },
    [setFeatures, annotationGroup, networkName, groupName],
  );

  React.useEffect(() => {
    async function loadAnnotationGroup() {
      const g = await mapApiUtil.getAnnotationGroup({networkName, groupName});
      if (g) {
        setAnnotationGroup(g);
        setFeatures(g.geojson);
      }
    }
    loadAnnotationGroup();
  }, [networkName, groupName, setFeatures]);

  return {
    features,
    updateFeatures,
    isLoading,
    isError,
  };
}
