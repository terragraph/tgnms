/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CloseIcon from '@material-ui/icons/Close';
import EditIcon from '@material-ui/icons/Edit';
import MapboxControl from '@fbcnms/tg-nms/app/views/map/mapControls/MapboxControl';
import React from 'react';
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
  iconButton: {borderRadius: '4px'},
  container: {
    '&:not(:empty)': {
      boxShadow: _theme.shadows[6],
    },
  },
}));

export default function DrawToggle() {
  const classes = useStyles();
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
          mapboxRef?.addControl(
            {
              onAdd: _map => {
                const container = drawControl.onAdd(_map);
                container.className = `mapboxgl-ctrl mapboxgl-ctrl-group ${classes.container}`;
                return container;
              },
              onRemove: () => drawControl.onRemove(),
            },
            MAP_CONTROL_LOCATIONS.TOP_LEFT,
          );
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
      [mapboxRef, drawControl, current, isControlAdded, classes.container],
    ),
  );
  React.useEffect(() => {
    setDrawControlState.current(isDrawEnabled);
  }, [isDrawEnabled, setDrawControlState]);

  return (
    <MapboxControl
      mapLocation={MAP_CONTROL_LOCATIONS.TOP_LEFT}
      data-testid="tg-draw-toggle-container">
      <button
        className={classes.iconButton}
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
      </button>
    </MapboxControl>
  );
}
