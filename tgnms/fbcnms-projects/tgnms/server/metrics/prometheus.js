/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import {DS_INTERVAL_SEC, PROMETHEUS_URL} from '../config';
import {createErrorHandler} from '../helpers/apiHelpers';
import {getLinkMetrics, getLinkMetricsByName} from './metrics';

const express = require('express');
const {getNetworkState} = require('../topology/model');
const logger = require('../log')(module);
const moment = require('moment');
const request = require('request');
const _ = require('lodash');

const router = express.Router();

/** Query raw stats given a "start" and "end" timestamp */
router.get('/query/raw', (req, res) => {
  query(req.query)
    .then(response => res.status(200).send(response))
    .catch(createErrorHandler(res));
});

/** Query raw stats given a relative time (e.g. 5 minutes ago) */
router.get('/query/raw/since', (req, res) => {
  const end = moment().unix();
  const start = moment()
    .subtract(req.query.value, req.query.units)
    .unix();

  const data = {
    query: req.query.query,
    start: start,
    end: end,
    step: req.query.step,
  };

  query(data)
    .then(response => res.status(200).send(response))
    .catch(createErrorHandler(res));
});

/** Query the latest stat */
router.get('/query/raw/latest', (req, res) => {
  queryLatest(req.query)
    .then(response => res.status(200).send(response))
    .catch(createErrorHandler(res));
});

/** Get list of friendly metric names */
router.get('/list', (req, res) => {
  getLinkMetrics()
    .then(linkMetrics => res.json(linkMetrics))
    .catch(createErrorHandler(res));
});

/** Get list of friendly metric names that are "like" searchTerm */
router.get('/search/:searchTerm', (req, res) => {
  getLinkMetricsByName(req.params.searchTerm)
    .then(linkMetrics => res.json(linkMetrics))
    .catch(createErrorHandler(res));
});

/** Query for latest value for a single metric across the network */
router.get('/overlay/linkStat/:topologyName/:metricNames', (req, res) => {
  const {metricNames, topologyName} = req.params;
  const metricNameList = metricNames.split(',');

  // Query all metrics, flatten results (if needed), and return a result set
  Promise.all(
    metricNameList.map(metricName => {
      return queryLatest({
        query: `${metricName}{network="${topologyName}", intervalSec="${DS_INTERVAL_SEC}"}`,
      });
    }),
  )
    .then(flattenPrometheusResponse)
    .then(result => groupByLink(result, topologyName))
    .then(result => res.json(result))
    .catch(createErrorHandler(res));
});

/** Query for the latest data point only and format by link */
router.get('/query/link/latest', (req, res) => {
  const {query, topologyName} = req.query;

  queryLatest({query: query})
    .then(flattenPrometheusResponse)
    .then(result => {
      return groupByLink(
        result,
        topologyName,
        false /* groupByLinkDirection */,
      );
    })
    .then(result => res.json(result))
    .catch(createErrorHandler(res));
});

/**
 * Utility functions
 */

function query(data: Object) {
  return createPrometheusRequest({
    uri: `${PROMETHEUS_URL}/api/v1/query_range`,
    method: 'GET',
    qs: data,
  });
}

function queryLatest(data: Object) {
  return createPrometheusRequest({
    uri: `${PROMETHEUS_URL}/api/v1/query`,
    method: 'GET',
    qs: data,
  });
}

function createPrometheusRequest(options: {[string]: any}) {
  return new Promise((resolve, reject) => {
    try {
      return request(options, (err, response) => {
        if (err) {
          return reject(err);
        }

        const parsed = JSON.parse(response.body);
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

function formatPrometheusLabel(metricName: string): string {
  return metricName.replace(/[\.\-\/\[\]]/g, '_');
}

/**
 * Functions for transforming Prometheus results server-side
 */

function flattenPrometheusResponse(
  response: Array<Object> | Object,
): Array<Object> {
  if (Array.isArray(response)) {
    return _.flatMap(response, resp => resp.data.result);
  } else {
    return response.data.result;
  }
}

function groupByLink(
  prometheusResponseList: Array<Object>,
  topologyName: string,
  groupByLinkDirection: boolean = true,
): {[string]: {[string]: {[string]: any}}} {
  const metrics = {};

  const networkState = getNetworkState(topologyName);
  if (!networkState?.topology?.links) {
    logger.info('No topology cache');
    return metrics;
  }

  // Map Prometheus-acceptable name to real name
  const linkMap = {};
  networkState.topology.links.forEach(link => {
    linkMap[formatPrometheusLabel(link.name)] = link.name;
  });

  prometheusResponseList.forEach(data => {
    const {__name__, linkName, linkDirection} = data.metric;

    if (!linkMap.hasOwnProperty(linkName)) {
      logger.debug(
        'Unable to match Prometheus link name in topology: ',
        linkName,
      );
      return;
    }

    const realLinkName = linkMap[linkName];
    if (!groupByLinkDirection) {
      metrics[realLinkName] = data.value[1];
    } else {
      if (!metrics.hasOwnProperty(realLinkName)) {
        metrics[realLinkName] = {};
      }

      if (!metrics[realLinkName].hasOwnProperty(linkDirection)) {
        metrics[realLinkName][linkDirection] = {};
      }

      metrics[realLinkName][linkDirection][__name__] = data.value[1];
    }
  });

  return metrics;
}

module.exports = router;
