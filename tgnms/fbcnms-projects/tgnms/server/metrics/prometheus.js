/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import {PROMETHEUS_URL} from '../config';

const {getNetworkState} = require('../topology/model');
const logger = require('../log')(module);
const request = require('request');
const _ = require('lodash');

export type PromQuery = {|
  query: string,
|};

export type PromRangeQuery = {|
  ...PromQuery,
  start: number,
  end: number,
  step: number,
|};

/**
 * Utility functions
 */

export function query(data: PromRangeQuery, networkName: string) {
  const prometheusUrl = getPrometheusUrlForNetwork(networkName);
  return createPrometheusRequest({
    uri: `${prometheusUrl}/api/v1/query_range`,
    method: 'GET',
    qs: data,
  });
}

export function queryLatest(data: Object, networkName: string) {
  const prometheusUrl = getPrometheusUrlForNetwork(networkName);
  return createPrometheusRequest({
    uri: `${prometheusUrl}/api/v1/query`,
    method: 'GET',
    qs: data,
  });
}

export function createPrometheusRequest<T>(options: {[string]: any}) {
  return new Promise<T>((resolve, reject) => {
    try {
      logger.debug(`Prometheus request: ${options.uri}`);
      return request(options, (err, response) => {
        if (err) {
          return reject(err);
        }
        if (response.statusCode >= 300) {
          return reject(
            new Error(
              `upstream prometheus returned HTTP ${response.statusCode} - ${response.body}`,
            ),
          );
        }
        let parsed = {};
        try {
          parsed = JSON.parse(response.body);
        } catch (err) {
          logger.error('Unable to parse response as JSON:', response.body);
          return reject({});
        }
        if (parsed.status === 'error') {
          logger.error('Prometheus response returned an error: ', parsed.error);
          return reject(parsed);
        }

        return resolve(parsed);
      });
    } catch (err) {
      return reject(err);
    }
  });
}

function getPrometheusUrlForNetwork(networkName: string): string {
  const state = getNetworkState(networkName);
  const promUrl = state?.prometheus_url;
  if (promUrl != null && promUrl.trim() !== '') {
    return promUrl;
  }
  return PROMETHEUS_URL;
}

/**
 * Functions for transforming Prometheus results server-side
 */

// add __name__ to response list
// this is necessary when a prometheus function/operator is called
export function mapMetricName(
  response: Array<Object> | Object,
  metricNameMapping: Array<string>,
): Array<Object> {
  if (response.length !== metricNameMapping.length) {
    console.error(
      'Invalid call to addMetricName. Response length must equal metric name mapping length.',
    );
    return response;
  }
  return response.map((data, idx) => {
    data.data.result = data.data.result.map(metricMeta => {
      metricMeta.metric['__name__'] = metricNameMapping[idx];
      return metricMeta;
    });
    return data;
  });
}

export function flattenPrometheusResponse(
  response: Array<Object> | Object,
): Array<Object> {
  if (Array.isArray(response)) {
    return _.flatMap(response, resp => resp.data.result);
  } else {
    return response.data.result;
  }
}

export function processData(prometheusResponse: Object): Object {
  const prometheusResponseList = prometheusResponse.data.result;
  return prometheusResponseList[0]?.metric?.__name__
    ? {[prometheusResponseList[0].metric.__name__]: prometheusResponseList}
    : {};
}

export function groupByLink(
  prometheusResponseList: Array<Object>,
  topologyName: string,
  groupByLinkDirection: boolean = true,
): {[string]: {[string]: {[string]: any}}} {
  const metrics = {};
  const networkState = getNetworkState(topologyName);
  if (!networkState?.topology?.links) {
    logger.info('No topology cache: ' + topologyName);
    return metrics;
  }

  prometheusResponseList.forEach(data => {
    const {__name__, linkName, linkDirection} = data.metric;

    if (!groupByLinkDirection) {
      metrics[linkName] = data.value[1];
    } else {
      if (!metrics.hasOwnProperty(linkName)) {
        metrics[linkName] = {};
      }

      if (!metrics[linkName].hasOwnProperty(linkDirection)) {
        metrics[linkName][linkDirection] = {};
      }

      metrics[linkName][linkDirection][__name__] = data.value[1];
    }
  });

  return metrics;
}

export function groupByNode(
  prometheusResponseList: Array<Object>,
  topologyName: string,
): {[string]: {[string]: {[string]: any}}} {
  const metrics = {};

  if (!prometheusResponseList) {
    return metrics;
  }

  const networkState = getNetworkState(topologyName);
  if (!networkState?.topology?.nodes) {
    logger.info('No topology cache');
    return metrics;
  }

  // Map Prometheus-acceptable name to real name
  const nodeMap = {};
  networkState.topology.nodes.forEach(node => {
    nodeMap[node.name] = node.name;
  });

  prometheusResponseList.forEach(data => {
    const {__name__, nodeName} = data.metric;

    if (!nodeMap.hasOwnProperty(nodeName)) {
      logger.debug(
        'Unable to match Prometheus node name in topology: ',
        nodeName,
      );
      return;
    }

    const realNodeName = nodeMap[nodeName];
    if (!metrics.hasOwnProperty(realNodeName)) {
      metrics[realNodeName] = {};
    }
    metrics[realNodeName][__name__] = data.value[1];
  });
  return metrics;
}
