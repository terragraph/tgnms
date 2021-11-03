/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import {Api} from '../Api';
import {DS_INTERVAL_SEC} from '../config';
import {createErrorHandler} from '../helpers/apiHelpers';
import {getLinkMetrics, getLinkMetricsByName} from './metrics';
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

export default class Metrics extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();

    /** Query raw stats given a "start" and "end" timestamp */
    router.get('/:networkName/query/raw', (req, res) => {
      const networkName = req.params.networkName;
      query(req.query, networkName)
        .then(response => res.status(200).send(response))
        .catch(createErrorHandler(res));
    });

    /**
     * Query an array of metric based stats given a "start" and "end" timestamp
     */
    router.get('/:networkName/query/dataArray', (req, res) => {
      const {queries, start, end, step} = req.query;
      if (queries == null || !Array.isArray(queries)) {
        return res.status(400).json({error: 'queries must be an array'});
      }
      const networkName = req.params.networkName;
      Promise.all(
        queries.map((queryString: string) => {
          const data = {
            query: queryString,
            start: start,
            end: end,
            step: step,
          };
          return query(data, networkName);
        }),
      )
        .then(responses => {
          res.status(200).send(
            responses.reduce((final, response) => {
              return {...final, ...processData(response)};
            }, {}),
          );
        })
        .catch(createErrorHandler(res));
    });

    /** Query the latest stat */
    router.get('/:networkName/query/raw/latest', (req, res) => {
      const networkName = req.params.networkName;
      queryLatest(req.query, networkName)
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
    router.get('/:networkName/overlay/linkStat/:metricNames', (req, res) => {
      const {metricNames, networkName} = req.params;
      const metricNameList = metricNames.split(',');

      // Query all metrics, flatten results (if needed), and return a result set
      Promise.all(
        metricNameList.map(metricName => {
          return queryLatest(
            {
              // eslint-disable-next-line max-len
              query: `${metricName}{network="${networkName}", intervalSec="${DS_INTERVAL_SEC}"}`,
            },
            networkName,
          );
        }),
      )
        .then(flattenPrometheusResponse)
        .then(result => groupByLink(result, networkName))
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    /** Query for the latest data point only and format by link */
    router.get('/:networkName/query/link/latest', (req, res) => {
      const topologyName = req.params.networkName;
      const {query} = req.query;
      if (typeof topologyName !== 'string' || topologyName === '') {
        return res.status(400).json({error: 'topologyName missing from query'});
      }

      queryLatest({query: query}, topologyName)
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

    // raw stats data
    router.get('/:networkName/link_analyzer', (req, res) => {
      const networkName = req.params.networkName;
      const timeWindow = '[1h]';
      // the outer subquery requires slightly different syntax
      // [<range>:[<resolution>]]
      const timeWindowSubquery = '[1h:]';
      const prometheusQueryList = ['snr', 'mcs', 'tx_power'].map(
        metricName => ({
          metricName: `avg_${metricName}`,
          prometheusQuery: `avg_over_time(${metricName}{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})`,
        }),
      );
      prometheusQueryList.push({
        metricName: 'flaps',
        prometheusQuery: `resets(fw_uptime{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})`,
      });
      prometheusQueryList.push({
        metricName: 'avg_per',
        prometheusQuery: `avg_over_time(rate(tx_fail{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}) / (avg_over_time(rate(tx_fail{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}) + avg_over_time(rate(tx_ok{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}))`,
      });
      prometheusQueryList.push({
        metricName: 'avg_tput',
        prometheusQuery: `avg_over_time(rate(tx_ok{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery}) + avg_over_time(rate(tx_fail{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}${timeWindow})${timeWindowSubquery})`,
      });
      prometheusQueryList.push({
        metricName: 'tx_beam_idx',
        prometheusQuery: `tx_beam_idx{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}`,
      });
      prometheusQueryList.push({
        metricName: 'rx_beam_idx',
        prometheusQuery: `rx_beam_idx{network="${networkName}",intervalSec="${DS_INTERVAL_SEC}"}`,
      });
      // TODO - add availability once published as a stat
      Promise.all(
        prometheusQueryList.map(({prometheusQuery}) => {
          return queryLatest(
            {
              query: prometheusQuery,
            },
            networkName,
          );
        }),
      )
        .then(response =>
          mapMetricName(
            response,
            prometheusQueryList.map(({metricName}) => metricName),
          ),
        )
        .then(flattenPrometheusResponse)
        .then(result => groupByLink(result, networkName, true))
        .then(result => res.json(result))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/node_health', (req, res) => {
      const topologyName = req.params.networkName;
      // this is set statically in NetworkNodesTable
      // TODO - make this configurable
      const timeWindow = '[24h]';

      const prometheusQueryList = ['e2e_minion_uptime'].map(metricName => ({
        metricName: `resets_${metricName}`,
        prometheusQuery: `resets(${metricName}{network="${topologyName}"}${timeWindow})`,
      }));
      prometheusQueryList.push({
        metricName: 'availability',
        prometheusQuery: `avg_over_time(topology_node_is_online{network="${topologyName}"}${timeWindow})`,
      });

      Promise.all(
        prometheusQueryList.map(({prometheusQuery}) => {
          return queryLatest(
            {
              query: prometheusQuery,
            },
            topologyName,
          );
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
    });

    return router;
  }
}
