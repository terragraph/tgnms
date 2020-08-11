/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CloseIcon from '@material-ui/icons/Close';
import EditIcon from '@material-ui/icons/Edit';
import React from 'react';
import ReactDOM from 'react-dom';
import useLiveRef from '../../../hooks/useLiveRef';
import {
  ANNOTATION_DEFAULT_GROUP,
  useMapAnnotationContext,
  useMapAnnotationGroupState,
} from '../../../contexts/MapAnnotationContext';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '../../../contexts/MapContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';
import type {GeoFeature} from '@turf/turf';

export const MAPBOX_DRAW_EVENTS = {
  CREATE: 'draw.create',
  DELETE: 'draw.delete',
  UPDATE: 'draw.update',
  SELECTION_CHANGE: 'draw.selectionchange',
  MODE_CHANGE: 'draw.modechange',
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
  if (!mapboxControl) {
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
  const {
    setSelectedFeatureId,
    current,
    drawControl,
    updateFeatures,
  } = useMapAnnotationContext();
  const [isDrawEnabled, setIsDrawEnabled] = React.useState(false);

  useMapAnnotationGroupState({
    networkName,
    groupName: ANNOTATION_DEFAULT_GROUP,
  });

  const handleDrawToggle = useLiveRef(() => {
    const toggled = !isDrawEnabled;
    setIsDrawEnabled(toggled);
    if (toggled) {
      mapboxRef?.addControl(drawControl);
      drawControl.add(current?.geojson);
    } else {
      mapboxRef?.removeControl(drawControl);
    }
  });

  const handleDrawUpdate = useLiveRef(_update => {
    updateFeatures(drawControl.getAll());
  });

  const handleSelectionChange = useLiveRef(
    ({features}: {features: Array<GeoFeature>}) => {
      if (!features) {
        return;
      }
      const [lastSelected] = features.slice(-1);
      setSelectedFeatureId(lastSelected?.id);
    },
  );

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
    const handleDrawEvent = event => handleDrawUpdate.current(event);
    const handleSelectEvent = (...args) =>
      handleSelectionChange.current(...args);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.CREATE, handleDrawEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.CREATE, handleDrawEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.DELETE, handleDrawEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.UPDATE, handleDrawEvent);
    mapboxRef?.on(MAPBOX_DRAW_EVENTS.SELECTION_CHANGE, handleSelectEvent);
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
