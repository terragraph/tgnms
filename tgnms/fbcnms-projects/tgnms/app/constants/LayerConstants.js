/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

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

// colors per golay index
export const GOLAY_COLORS = [
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
  0: 'hsl(170,50%,50%)',
  1: 'hsl(30,50%,50%)',
  255: 'hsl(200,50%,50%)',
};

export const NETWORK_TEST_HEALTH_COLOR_RANGE = [
  HEALTH_DEFS[HEALTH_CODES.EXCELLENT].color,
  HEALTH_DEFS[HEALTH_CODES.HEALTHY].color,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].color,
  HEALTH_DEFS[HEALTH_CODES.WARNING].color,
  HEALTH_DEFS[HEALTH_CODES.UNKNOWN].color,
  HEALTH_DEFS[HEALTH_CODES.DOWN].color,
];
