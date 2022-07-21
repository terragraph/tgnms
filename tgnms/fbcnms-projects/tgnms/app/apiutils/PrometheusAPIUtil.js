/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import axios from 'axios';
import type {NetworkAnalyzerData} from '@fbcnms/tg-nms/shared/dto/NetworkState';
/**
 * 'network' and 'intervalSec' are mandatory Prometheus query labels
 */
export type QueryLabels = {
  network: string,
  intervalSec?: number,
  [string]: any,
};

/**
 * all of these prometheuis queries return an object with metric and value keys
 */

export type PrometheusDataType = {
  metric: PrometheusMetric,
  values: PrometheusValue,
};

export type PrometheusValue = Array<[number, string]>;

export type PrometheusMetric = {
  cn?: string,
  instance?: string,
  intervalSec?: string,
  job?: string,
  linkDirection?: string,
  linkName?: string,
  nodeName?: string,
  nodeMac?: string,
  network?: string,
  pop?: string,
  siteName?: string,
  __name__: string,
};

/**
 * Construct a Prometheus query from the metricName and labels
 */
export const createQuery = (
  metricName: string,
  labels: QueryLabels,
): string => {
  const {network, intervalSec, ...extras} = labels;
  const intervalDetails = intervalSec ? `intervalSec="${intervalSec}"` : '';
  const labelStr = Object.keys(extras)
    .map(label => `${label}="${extras[label]}"`)
    .concat([`network="${network}"`, intervalDetails])
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

export const addLabel = (_query: string, labelName: string, value: string) =>
  `label_replace(${_query}, "${labelName}", "${value}", "", "")`;

/**
 * Functions for querying raw stats from Prometheus
 */

export const query = (
  query: string,
  start: number,
  end: number,
  step: number,
  networkName: string,
): Promise<any> => {
  return axios.get(`/metrics/${networkName}/query/raw`, {
    params: {
      query: query,
      start: start,
      end: end,
      step: step,
    },
  });
};

// queries multiple metrics from prometheus at the same time
export const queryDataArray = (
  queries: Array<string>,
  start: number,
  end: number,
  step: number,
  networkName: string,
): Promise<any> => {
  return axios.get(`/metrics/${networkName}/query/dataArray`, {
    params: {
      queries: queries,
      start: start,
      end: end,
      step: step,
    },
  });
};

export const queryLatest = async (
  query: string,
  networkName: string,
): Promise<any> => {
  const response = await axios.get(`/metrics/${networkName}/query/raw/latest`, {
    params: {query: query},
  });
  return response.data.data;
};

export const queryLatestGroupByLink = async (
  query: string,
  networkName: string,
): Promise<any> => {
  const response = await axios.get(
    `/metrics/${networkName}/query/link/latest`,
    {
      params: {query: query},
    },
  );
  return response.data;
};

export const getNodeHealth = async ({
  networkName,
}: {
  networkName: string,
}): Promise<{}> => {
  const response = await axios.get(`/metrics/${networkName}/node_health`);
  return response.data;
};

export const getLinkAnalyzer = async ({
  networkName,
}: {
  networkName: string,
}): Promise<NetworkAnalyzerData> => {
  const response = await axios.get(`/metrics/${networkName}/link_analyzer`);
  return response.data;
};
