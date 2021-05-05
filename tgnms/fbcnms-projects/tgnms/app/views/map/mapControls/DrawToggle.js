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
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {
  ANNOTATION_DEFAULT_GROUP,
  useDrawState,
  useMapAnnotationContext,
  useMapAnnotationGroupState,
} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const useStyles = makeStyles(_theme => ({
  icon: {
    fontSize: '1rem',
  },
}));

export default function DrawLayer() {
  const classes = useStyles();
  const {isDrawEnabled, setIsDrawEnabled, mapboxControl} = useDrawLayer();
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
      onClick={() => setIsDrawEnabled(!isDrawEnabled)}
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

function useDrawLayer() {
  const {networkName} = useNetworkContext();
  const {mapboxRef} = useMapContext();
  const {
    current,
    drawControl,
    isDrawEnabled,
    setIsDrawEnabled,
  } = useMapAnnotationContext();
  useMapAnnotationGroupState({
    networkName,
    groupName: ANNOTATION_DEFAULT_GROUP,
  });
  useDrawState();
  const isControlAdded = React.useRef(false);

  const setDrawControlState = useLiveRef(
    React.useCallback(
      (enabled: boolean) => {
        if (enabled) {
          mapboxRef?.addControl(drawControl, MAP_CONTROL_LOCATIONS.TOP_LEFT);
          isControlAdded.current = true;
          if (current && current.geojson) {
            drawControl.add(current.geojson);
          }
        } else {
          if (isControlAdded.current === true) {
            mapboxRef?.removeControl(drawControl);
            isControlAdded.current = false;
          }
        }
      },
      [mapboxRef, drawControl, current, isControlAdded],
    ),
  );
  React.useEffect(() => {
    setDrawControlState.current(isDrawEnabled);
  }, [isDrawEnabled, setDrawControlState]);

  const mapboxControl = React.useMemo(() => {
    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    container.setAttribute('data-testid', 'tg-draw-toggle-container');
    return container;
  }, []);

  useOnceInitialized(() => {
    mapboxRef?.addControl(
      {
        onAdd: _map => {
          return mapboxControl;
        },
        onRemove: () => {},
      },
      MAP_CONTROL_LOCATIONS.TOP_LEFT,
    );
  }, [mapboxRef]);

  return {
    mapboxControl,
    mapboxRef,
    isDrawEnabled,
    setIsDrawEnabled,
  };
}

export function useOnceInitialized(fn: () => void | any, deps: Array<*>) {
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
