/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {Layer, Source} from 'react-mapbox-gl';

import type {Overlay} from '../NetworkMapTypes';

type Props = {|overlay: Overlay, data?: {}|};
export default function PolygonLayer({overlay, data}: Props) {
  const {Component} = overlay;
  if (Component) {
    return <Component overlay={overlay} />;
  }
  // if there is no custom component, render the data as geojson
  return (
    <>
      <Source id="polygon" geoJsonSource={{type: 'geojson', data: data}} />
      <Layer
        before="link-normal"
        type="fill"
        sourceId={'polygon'}
        layout={{}}
        paint={{
          'fill-color': '#cccccc',
          'fill-outline-color': '#eeeeee',
          'fill-opacity': 0.6,
        }}
      />
    </>
  );
}
