/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import {MAP_CONTROL_LOCATIONS} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

export default function MapboxNavigationControl() {
  const {mapboxRef} = useMapContext();
  const navControl = new mapboxgl.NavigationControl({});

  React.useEffect(() => {
    mapboxRef?.addControl(navControl, MAP_CONTROL_LOCATIONS.TOP_LEFT);
  }, [mapboxRef, navControl]);

  return null;
}
