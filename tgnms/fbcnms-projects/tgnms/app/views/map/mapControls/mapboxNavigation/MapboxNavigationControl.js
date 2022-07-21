/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {makeStyles} from '@material-ui/styles';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

const useStyles = makeStyles(theme => ({
  container: {
    '&:not(:empty)': {
      boxShadow: theme.shadows[6],
    },
  },
}));

export default function MapboxNavigationControl() {
  const classes = useStyles();
  const {mapboxRef} = useMapContext();

  React.useEffect(() => {
    const navControl = new mapboxgl.NavigationControl({});
    mapboxRef?.addControl(
      {
        onAdd: _map => {
          const container = navControl.onAdd(_map);
          container.className = `mapboxgl-ctrl mapboxgl-ctrl-group ${classes.container}`;
          return container;
        },
        onRemove: () => navControl.onRemove(),
      },
      MAP_CONTROL_LOCATIONS.TOP_LEFT,
    );
  }, [mapboxRef, classes.container]);

  return null;
}
