/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 *
 * Used to style annotation features.
 * https://docs.mapbox.com/mapbox-gl-js/style-spec/
 */

import theme from '@mapbox/mapbox-gl-draw/src/lib/theme';
import {GEOMETRY_TYPE} from './GeoJSONConstants';
import {
  blue,
  green,
  orange,
  purple,
  red,
  yellow,
} from '@material-ui/core/colors';

export const MAPBOX_DRAW_DEFAULT_STYLES = theme;
export const MAPBOX_DRAW_DEFAULT_STYLE_IDS: {|[string]: string|} = {
  POINT_ACTIVE: 'gl-draw-point-active',
  POINT_INACTIVE: 'gl-draw-point-inactive',
  POINT_STROKE_ACTIVE: 'gl-draw-point-stroke-active',
  POINT_STROKE_INACTIVE: 'gl-draw-point-point-stroke-inactive',
  POINT_STATIC: 'gl-draw-point-static',
  LINE_INACTIVE: 'gl-draw-line-inactive',
  LINE_ACTIVE: 'gl-draw-line-active',
  LINE_STATIC: 'gl-draw-line-static',
  POLYGON_FILL_STATIC: 'gl-draw-polygon-fill-static',
  POLYGON_STROKE_STATIC: 'gl-draw-polygon-stroke-static',
  POLYGON_FILL_INACTIVE: 'gl-draw-polygon-fill-inactive',
  POLYGON_FILL_ACTIVE: 'gl-draw-polygon-fill-active',
  POLYGON_MIDPOINT: 'gl-draw-polygon-midpoint',
  POLYGON_STROKE_INACTIVE: 'gl-draw-polygon-stroke-inactive',
  POLYGON_STROKE_ACTIVE: 'gl-draw-polygon-stroke-active',
  VERTEX_STROKE_INACTIVE: 'gl-draw-polygon-and-line-vertex-stroke-inactive',
  VERTEX_INACTIVE: 'gl-draw-polygon-and-line-vertex-inactive',
};

export const GEO_GEOM_TYPE_TITLES = {
  [(GEOMETRY_TYPE.POINT: string)]: 'Point',
  [(GEOMETRY_TYPE.POLYGON: string)]: 'Polygon',
  [(GEOMETRY_TYPE.LINE_STRING: string)]: 'Line',
};

export const TG_DRAW_STYLES = [
  {
    id: 'tg-draw-title',
    type: 'symbol',
    filter: ['all', ['==', 'meta', 'feature']],
    layout: {
      // show title if feature is selected or "Show Title" is checked
      'text-field': [
        'case',
        [
          'any',
          ['==', ['get', 'user_showName'], true],
          [
            '==',
            ['get', 'active'],
            'true', // mapbox-gl-draw's active property is a string
          ],
        ],
        // if the case expression evaluates to true, show the feature's title
        ['get', 'user_name'],
        // else show nothing
        '',
      ],
      'text-size': 14,
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#fff',
      'text-halo-color': '#333',
      'text-halo-width': 0.6,
      'text-halo-blur': 1,
    },
  },
];

export const MAPBOX_DRAW_DEFAULT_COLOR = '#3bb2d0';
export const MAPBOX_DRAW_VERTEX_COLOR = '#cccccc';

export const ANNOTATION_COLORS = [
  green[500],
  red[500],
  yellow[500],
  blue[500],
  orange[500],
  purple[500],
];
