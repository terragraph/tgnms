/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
import {
  GraphAggregationValueMap as GraphAggregation,
  StatsOutputFormatValueMap as StatsOutputFormat,
} from '../../shared/types/Stats';

const {BERINGEI_QUERY_URL} = require('../config');
const {getAnalyzerData} = require('../topology/analyzer_data');
const express = require('express');
const request = require('request');
const logger = require('../log')(module);

const router = express.Router();

// raw stats data
router.get('/overlay/linkStat/:topologyName/:metricName', (req, res) => {
  const {topologyName} = req.params;
  const metricName = req.params.metricName.split(',');
  const linkQuery = {
    aggregation: GraphAggregation.LATEST,
    keyNames: metricName,
    maxResults: 0 /* All results */,
    minAgo: 60 /* 1 hour */,
    outputFormat: StatsOutputFormat.RAW_LINK,
    topologyName,
  };
  const chartUrl = BERINGEI_QUERY_URL + '/stats_query';
  request.post(
    {
      body: JSON.stringify(linkQuery),
      url: chartUrl,
    },
    (err, httpResponse, _body) => {
      if (err) {
        logger.error('Error fetching from beringei: %s', err);
        res
          .status(500)
          .send('Error fetching data')
          .end();
        return;
      }
      res.send(httpResponse.body).end();
    },
  );
});

// newer charting, for multi-linechart/row
router.post('/multi_chart', (req, res, _next) => {
  // proxy query
  const chartUrl = BERINGEI_QUERY_URL + '/stats_query';
  request.post(
    {
      body: JSON.stringify(req.body),
      url: chartUrl,
    },
    (err, httpResponse, _body) => {
      if (err) {
        logger.error('Failed on /multi_chart: %s', err);
        return;
      }
      if (httpResponse) {
        res.send(httpResponse.body).end();
      } else {
        res
          .status(500)
          .send('No Data')
          .end();
      }
    },
  );
});

router.post('/stats_ta', (req, res, _next) => {
  const taUrl = BERINGEI_QUERY_URL + '/stats_typeahead';
  request.post(
    {
      body: JSON.stringify(req.body),
      url: taUrl,
    },
    (err, httpResponse, body) => {
      if (err) {
        logger.error('Error fetching from beringei: %s', err);
        res.status(500).end();
        return;
      }
      res.send(body).end();
    },
  );
});

// raw stats data
router.get('/link_analyzer/:topologyName', (req, res, _next) => {
  const topologyName = req.params.topologyName;
  const analyzerData = getAnalyzerData(topologyName);
  if (analyzerData !== null) {
    res.send(analyzerData).end();
  } else {
    logger.debug('No analyzer cache found for: %s', topologyName);
    res.send('No analyzer cache').end();
  }
});

module.exports = router;
