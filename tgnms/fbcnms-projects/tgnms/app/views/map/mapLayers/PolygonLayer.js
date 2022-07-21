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
import {Layer, Source} from 'react-mapbox-gl';

import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

type Props = {|overlay: Overlay, data?: {}|};
export default function PolygonLayer({overlay, data}: Props) {
  if (!overlay) {
    return null;
  }
  const {Component} = overlay;
  if (Component) {
    return <Component overlay={overlay} />;
  }

  if (!data) {
    return null;
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
