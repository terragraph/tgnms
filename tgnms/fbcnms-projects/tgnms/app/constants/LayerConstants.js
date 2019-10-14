/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import blue from '@material-ui/core/colors/blue';
import brown from '@material-ui/core/colors/brown';
import green from '@material-ui/core/colors/green';
import grey from '@material-ui/core/colors/grey';
import lightGreen from '@material-ui/core/colors/lightGreen';
import orange from '@material-ui/core/colors/orange';
import purple from '@material-ui/core/colors/purple';
import red from '@material-ui/core/colors/red';
import {HEALTH_CODES, HEALTH_DEFS} from './HealthConstants';

export const LinkOverlayColors = {
  ignition_status: {
    link_up: {color: green[800]},
    link_down: {color: red[600]},
    igniting: {color: purple[500]},
    unknown: {color: grey[500]},
  },
  metric: {
    excellent: {color: green[800]},
    good: {color: lightGreen[500]},
    marginal: {color: orange[500]},
    poor: {color: red[600]},
    missing: {color: grey[500]},
  },
};

export const SiteOverlayColors = {
  health: {
    healthy: {color: green[800]},
    unhealthy: {color: red[600]},
    partial: {color: orange[500]},
    empty: {color: grey[500]},
  },
  polarity: {
    odd: {color: blue[500]},
    even: {color: brown[500]},
    hybrid_odd: {color: green[800]},
    hybrid_even: {color: purple[500]},
    hw_hybrid: {color: orange[500]},
    unknown: {color: red[600]},
  },
};

// range of colors for metric overlays from best to worst
export const METRIC_COLOR_RANGE = [
  LinkOverlayColors.metric.excellent.color,
  LinkOverlayColors.metric.good.color,
  LinkOverlayColors.metric.marginal.color,
  LinkOverlayColors.metric.poor.color,
];

// Colors used for link overlays of
// attributes with discrete values that
// do not have a "best to worst" relationship
export const INDEX_COLORS = [
  'hsl(0,50%,50%)',
  'hsl(170,50%,50%)',
  'hsl(30,50%,50%)',
  'hsl(200,50%,50%)',
  'hsl(60,50%,50%)',
  'hsl(240,50%,50%)',
  'hsl(100,50%,50%)',
  'hsl(280,50%,50%)',
];

// colors per control superframe
export const SUPERFRAME_COLORS = {
  [0]: 'hsl(170,50%,50%)',
  [1]: 'hsl(30,50%,50%)',
  [255]: 'hsl(200,50%,50%)',
};

export const NETWORK_TEST_HEALTH_COLOR_RANGE = [
  HEALTH_DEFS[HEALTH_CODES.EXCELLENT].color,
  HEALTH_DEFS[HEALTH_CODES.HEALTHY].color,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].color,
  HEALTH_DEFS[HEALTH_CODES.WARNING].color,
  HEALTH_DEFS[HEALTH_CODES.UNKNOWN].color,
  HEALTH_DEFS[HEALTH_CODES.DOWN].color,
];

// === SITES ===
// === Base paint (for all site types) ===
export const POSITION_CIRCLE_PAINT = {
  'circle-blur': 0.15,
  'circle-color': ['get', 'siteColor'],
  'circle-radius': ['get', 'circleRadius'],
  'circle-stroke-color': ['get', 'strokeColor'],
  'circle-stroke-opacity': 0.6,
  'circle-stroke-width': ['get', 'strokeWidth'],
};
export const CIRCLE_RADIUS = 10;
export const INNER_CIRCLE_RADIUS = 5;

// === Inner circle paint (for special site types) ===
// TODO - Make a legend for this
export const POP_SITE_COLOR = 'blue';
export const CN_SITE_COLOR = 'pink';

// === Selected site paint ===
export const SELECTED_CIRCLE_STROKE_COLOR = '#0077ff';
export const SELECTED_CIRCLE_STROKE_WIDTH = 5;

// === Planned site paint ===
export const PLANNED_SITE_COLOR = '#fff';
export const PLANNED_SITE_STROKE_COLOR = '#000';

// === "Search Nearby" site paint ===
export const SEARCH_NEARBY_SITE_COLOR = '#eee';
export const SEARCH_NEARBY_STROKE_COLOR = '#aec6cf';
export const SEARCH_NEARBY_STROKE_WIDTH = 5;

// === LINK LINES ===
// each link render type gets 2 mapboxgl layers
export const LinkRenderType = {
  HIDDEN: null,
  NORMAL: 'link-normal',
  BACKUP_CN: 'link-backup-cn',
  WIRED_INTERSITE: 'link-wired-intersite',
};

export const LINE_PAINT = {
  'line-color': ['get', 'linkColor'],
  'line-width': 8,
};

export const LINE_BACKUP_CN_PAINT = {
  ...LINE_PAINT,
  'line-dasharray': [0.05, 1.5],
};

export const LINE_WIRED_INTERSITE_PAINT = {
  ...LINE_PAINT,
  'line-dasharray': [0.02, 1.5],
};

export const LINE_LAYOUT = {
  'line-join': 'round',
  'line-cap': 'round',
};

// === Selected link casing ===
export const LINE_CASING_PAINT = {
  'line-gap-width': LINE_PAINT['line-width'],
  'line-color': '#0077ff',
  'line-width': 4,
  'line-opacity': 0.6,
};

// === Link overlay text (e.g. for link metrics) ===
export const LINE_TEXT_PAINT = {
  'text-color': '#fff',
  'text-halo-color': '#444',
  'text-halo-width': 1,
  'text-halo-blur': 1,
};

export const LINE_TEXT_LAYOUT = {
  'text-field': '{text}',
  'text-size': 14,
  'text-anchor': 'center',
  'text-allow-overlap': true,
  'text-ignore-placement': true,
  // Place the text on the line...
  // TODO use 'line-center' (mapbox-gl-js >= 0.47.0)
  'symbol-placement': 'line',
  // TODO weird behavior... should be very high (~10000) to avoid duplication,
  // but text won't always appear on the line without a low value (~100)
  'symbol-spacing': 80,
};

// === "Search Nearby" links ===
export const SEARCH_NEARBY_LINE_PAINT = {
  'line-color': '#aec6cf',
  'line-width': 3,
  'line-dasharray': [1, 2],
};
export const SEARCH_NEARBY_FILL_PAINT = {
  'fill-color': '#aec6cf',
  'fill-opacity': 0.3,
};
