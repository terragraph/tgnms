/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import axios from 'axios';

/**
 * 'topologyName' and 'intervalSec' are mandatory Prometheus query labels
 */
type QueryLabels = {
  topologyName: string,
  intervalSec: number,
  [string]: any,
};

/**
 * Construct a Prometheus query from the metricName and labels
 */
export const createQuery = (
  metricName: string,
  labels: QueryLabels,
): string => {
  const {topologyName, intervalSec, ...extras} = labels;

  const labelStr = Object.keys(extras)
    .map(label => `${label}="${extras[label]}"`)
    .concat([`network="${topologyName}"`, `intervalSec="${intervalSec}"`])
    .join(', ');

  return `${metricName}{${labelStr}}`;
};

/**
 * Built-in Prometheus query transformation operators/functions
 */

export const avg = (query: string): string => {
  return `avg(${query})`;
};

export const avgOverTime = (query: string, range: string): string => {
  return `avg_over_time(${query} [${range}])`;
};

export const increase = (query: string, range: string): string => {
  return `increase(${query} [${range}])`;
};

/**
 * Functions for querying raw stats from Prometheus
 */

export const query = (
  query: string,
  start: number,
  end: number,
  step: string,
): Promise<any> => {
  return axios.get('/metrics/query/raw', {
    params: {
      query: query,
      start: start,
      end: end,
      step: step,
    },
  });
};

export const querySince = (
  query: string,
  step: string,
  value: number,
  units: string,
): Promise<any> => {
  return axios.get('/metrics/query/since', {
    params: {
      query: query,
      value: value,
      units: units,
      step: step,
    },
  });
};

export const queryLatest = (query: string): Promise<any> => {
  return axios.get('/metrics/query/raw/latest', {params: {query: query}});
};
