/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import {Layer} from 'react-mapbox-gl';
import {withStyles} from '@material-ui/core/styles';

/** Copied from: http://alex3165.github.io/react-mapbox-gl/demos -> "3d-map" */

const styles = {};

const PAINT_LAYER = {
  'fill-extrusion-color': '#aaa',
  'fill-extrusion-height': {
    type: 'identity',
    property: 'height',
  },
  'fill-extrusion-base': {
    type: 'identity',
    property: 'min_height',
  },
  'fill-extrusion-opacity': 0.9,
};

type Props = {};

class BuildingsLayer extends React.Component<Props> {
  render() {
    return (
      <Layer
        id="3d-buildings"
        before="link-normal"
        sourceId="composite"
        sourceLayer="building"
        filter={['==', 'extrude', 'true']}
        type="fill-extrusion"
        minZoom={14}
        paint={PAINT_LAYER}
      />
    );
  }
}

export default withStyles(styles)(BuildingsLayer);
