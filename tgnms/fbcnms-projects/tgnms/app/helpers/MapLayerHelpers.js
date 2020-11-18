/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {METRIC_COLOR_RANGE} from '../constants/LayerConstants';
import {interpolateHcl} from 'd3-interpolate';
import {scaleLinear} from 'd3-scale';

/**
 * Makes a function which maps from the input domain to the provided color range
 * Colors are linearly interpolated between stops.
 */
export function makeRangeColorFunc(
  domain: Array<number>,
  colorRange: ?Array<string>,
): (value: number) => string {
  return scaleLinear()
    .domain(domain)
    .range(colorRange || METRIC_COLOR_RANGE)
    .interpolate(interpolateHcl);
}
