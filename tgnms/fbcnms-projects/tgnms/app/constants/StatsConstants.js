/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {GraphAggregation} from '../../thrift/gen-nodejs/Stats_types';

// maximum name length to prevent legend taking over the graph
export const GRAPH_LINE_NAME_MAX_LENGTH = 40;
export const STATS_DEFAULT_INTERVAL_SEC = 30;

export const STATS_TIME_PICKER_OPTS = [
  {
    label: '30 Minutes',
    value: 30,
  },
  {
    label: '60 Minutes',
    value: 60,
  },
  {
    label: '2 Hours',
    value: 60 * 2,
  },
  {
    label: '6 Hours',
    value: 60 * 6,
  },
  {
    label: '12 Hours',
    value: 60 * 12,
  },
  {
    label: '1 Day',
    value: 60 * 24,
  },
  {
    label: '2 Days',
    value: 60 * 24 * 2,
  },
  {
    label: '1 Week',
    value: 7 * 60 * 24,
  },
  {
    label: '30 Days',
    value: 30 * 60 * 24,
  },
  {
    label: '90 Days',
    value: 90 * 60 * 24,
  },
];

export const STATS_GRAPH_AGG_OPTS = [
  {
    value: GraphAggregation.TOP_AVG,
    label: 'Top',
  },
  {
    value: GraphAggregation.BOTTOM_AVG,
    label: 'Bottom',
  },
  {
    value: GraphAggregation.AVG,
    label: 'Avg + Min/Max',
  },
  {
    value: GraphAggregation.SUM,
    label: 'Sum',
  },
  {
    value: GraphAggregation.COUNT,
    label: 'Count',
  },
];

export const STATS_MAX_DPS = [
  {
    label: '100',
    value: 100,
  },
  {
    label: '200',
    value: 200,
  },
  {
    label: 'No Limit (Raw)',
    value: 0,
  },
];

export const STATS_DS_INTERVAL_SEC = [
  {
    label: '1 second',
    value: 1,
  },
  {
    label: '30 seconds',
    value: 30,
  },
  {
    label: '15 minutes',
    value: 900,
  },
];

export const STATS_MAX_RESULTS = [
  {
    label: '5',
    value: 5,
  },
  {
    label: '10',
    value: 10,
  },
  {
    label: 'All',
    value: 0,
  },
];
