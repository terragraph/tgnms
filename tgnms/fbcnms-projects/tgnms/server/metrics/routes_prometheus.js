/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import {DS_INTERVAL_SEC} from '../config';
import {createErrorHandler} from '../helpers/apiHelpers';
import {getLinkMetrics, getLinkMetricsByName} from './metrics';
import type {ExpressRequest, ExpressResponse} from 'express';

const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const {
  query,
  queryLatest,
  flattenPrometheusResponse,
  groupByLink,
  groupByNode,
  mapMetricName,
  processData,
} = require('./prometheus');

const router: express.Router<
  ExpressRequest,
  ExpressResponse,
> = express.Router();

/** Query raw stats given a "start" and "end" timestamp */
router.get('/query/raw', (req, res) => {
  query(req.query)
    .then(response => res.status(200).send(response))
    .catch(createErrorHandler(res));
});

/** Query an array of metric based stats given a "start" and "end" timestamp */
router.get('/query/dataArray', (req, res) => {
  const {queries, start, end, step, topologyName} = req.query;
  Promise.all(
    /* $FlowFixMe req.query is user-controlled input, properties and values
      in this object are untrusted and should be validated before trusting */
    queries.map((queryString: string) => {
      const data = {
        query: queryString,
        start: start,
        end: end,
        step: step,
      };
      return query(data);
    }),
  )
    .then(responses => {
      res.status(200).send(
        responses.reduce((final, response) => {
          /* $FlowFixMe req.query is usercontrolled input, properties and values
         in this object are untrusted and should be validated before trusting */
          return {...final, ...processData(response, topologyName)};
        }, {}),
      );
    })
    .catch(createErrorHandler(res));
});

/** Query raw stats given a relative time (e.g. 5 minutes ago) */
router.get('/query/raw/since', (req, res) => {
  const end = moment().unix();
  const start = moment()
    /* $FlowFixMe req.query is user-controlled input, properties and values
       in this object are untrusted and should be validated before trusting */
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
        /* $FlowFixMe req.query is user-controlled input, properties and values
         in this object are untrusted and should be validated before trusting */
        topologyName,
        false /* groupByLinkDirection */,
      );
    })
    .then(result => res.json(result))
    .catch(createErrorHandler(res));
});

// raw stats data
router.get(
  '/link_analyzer/:topologyName',
  (req: ExpressRequest, res: ExpressResponse, _next) => {
    const topologyName = req.params.topologyName;
    const timeWindow = '[1h]';
    // the outer subquery requires slightly different syntax
    // [<range>:[<resolution>]]
    const timeWindowSubquery = '[1h:]';
    const prometheusQueryList = ['snr', 'mcs', 'tx_power'].map(metricName => ({
      metricName: `avg_${metricName}`,
      prometheusQuery: `avg_over_time(${metricName}{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})`,
    }));
    prometheusQueryList.push({
      metricName: 'flaps',
      prometheusQuery: `resets(fw_uptime{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})`,
    });
    prometheusQueryList.push({
      metricName: 'avg_per',
      prometheusQuery: `avg_over_time(rate(tx_fail{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}) / (avg_over_time(rate(tx_fail{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}) + avg_over_time(rate(tx_ok{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}))`,
    });
    prometheusQueryList.push({
      metricName: 'avg_tput',
      prometheusQuery: `avg_over_time(rate(tx_ok{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}) + avg_over_time(rate(tx_fail{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery})`,
    });
    prometheusQueryList.push({
      metricName: 'tx_beam_idx',
      prometheusQuery: `tx_beam_idx{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}`,
    });
    prometheusQueryList.push({
      metricName: 'rx_beam_idx',
      prometheusQuery: `rx_beam_idx{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}`,
    });
    // TODO - add availability once published as a stat
    Promise.all(
      prometheusQueryList.map(({prometheusQuery}) => {
        return queryLatest({
          query: prometheusQuery,
        });
      }),
    )
      .then(response =>
        mapMetricName(
          response,
          prometheusQueryList.map(({metricName}) => metricName),
        ),
      )
      .then(flattenPrometheusResponse)
      .then(result => groupByLink(result, topologyName, true))
      .then(result => res.json(result))
      .catch(createErrorHandler(res));
  },
);

router.get(
  '/node_health/:topologyName',
  (req: ExpressRequest, res: ExpressResponse, _next) => {
    const topologyName = req.params.topologyName;
    // this is set statically in NetworkNodesTable
    // TODO - make this configurable
    const timeWindow = '[24h]';

    const prometheusQueryList = ['e2e_minion_uptime'].map(metricName => ({
      metricName: `resets_${metricName}`,
      prometheusQuery: `resets(${metricName}{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})`,
    }));

    Promise.all(
      prometheusQueryList.map(({prometheusQuery}) => {
        return queryLatest({
          query: prometheusQuery,
        });
      }),
    )
      .then(response =>
        mapMetricName(
          response,
          prometheusQueryList.map(({metricName}) => metricName),
        ),
      )
      .then(flattenPrometheusResponse)
      .then(result => groupByNode(result, topologyName))
      .then(result => res.json(result))
      .catch(createErrorHandler(res));
  },
);

module.exports = router;
