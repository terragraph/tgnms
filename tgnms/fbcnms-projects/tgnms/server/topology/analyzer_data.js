/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {BERINGEI_QUERY_URL} = require('../config');
const _ = require('lodash');
import {
  GraphAggregationValueMap as GraphAggregation,
  StatsOutputFormatValueMap as StatsOutputFormat,
} from '../../shared/types/Stats';
const request = require('request');
const logger = require('../log')(module);

const analyzerData = {}; // cached results

function getAnalyzerData(topologyName) {
  return _.get(analyzerData, topologyName, null);
}

function refreshAnalyzerData(topologyName) {
  const linkQuery = {
    aggregation: GraphAggregation.LINK_STATS,
    keyNames: ['fw_uptime', 'tx_ok', 'tx_fail', 'mcs', 'tx_power', 'snr'],
    maxResults: 0 /* All results */,
    minAgo: 60 /* 1 hour */,
    outputFormat: StatsOutputFormat.RAW_LINK,
    topologyName,
  };
  const startTime = new Date();
  const chartUrl = BERINGEI_QUERY_URL + '/stats_query';
  request.post(
    {
      body: JSON.stringify(linkQuery),
      url: chartUrl,
    },
    (err, httpResponse, _body) => {
      if (err) {
        logger.error('Error fetching from beringei: %s', err);
        return;
      }
      const totalTime = new Date() - startTime;
      logger.info(
        'Fetched analyzer data for %s in %f ms',
        topologyName,
        totalTime,
      );
      let parsed;
      try {
        parsed = JSON.parse(httpResponse.body);
      } catch (ex) {
        logger.error('Failed to parse json for analyzer data.');
        return;
      }
      analyzerData[topologyName] = parsed;
    },
  );
}

module.exports = {
  getAnalyzerData,
  refreshAnalyzerData,
};
