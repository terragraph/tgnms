/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {BERINGEI_QUERY_URL} = require('../config');
const {getAnalyzerData} = require('../topology/analyzer_data');
// new json writer
const dataJson = require('./dataJson');

const express = require('express');
const request = require('request');
const logger = require('../log')(module);

const router = express.Router();

// raw stats data
router.get(/\/overlay\/linkStat\/(.+)\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  const metricName = req.params[1];
  const linkMetrics = [
    {
      name: 'not_used',
      metric: metricName,
      type: 'latest',
      min_ago: 60 /* 1 hour */,
    },
  ];
  const query = {
    topologyName,
    nodeQueries: [],
    linkQueries: linkMetrics,
  };
  const chartUrl = BERINGEI_QUERY_URL + '/table_query';
  request.post(
    {
      url: chartUrl,
      body: JSON.stringify(query),
    },
    (err, httpResponse, body) => {
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
router.post(/\/multi_chart\/$/i, (req, res, next) => {
  // proxy query
  const chartUrl = BERINGEI_QUERY_URL + '/query';

  // If the request window begin time is before 3 days, use the low frequency
  // database.
  if (req.body.length > 0) {
    if ('min_ago' in req.body[0] && req.body[0].min_ago > 3 * 24 * 60) {
      console.log(
        'Using low freq Beringei database for data fetching with min ago',
      );
      req.body[0].interval = 900;
    } else if (
      'start_ts' in req.body[0] &&
      req.body[0].start_ts < new Date().getTime() / 1000 - 3 * 24 * 60 * 60
    ) {
      console.log(
        'Using low freq Beringei database for data fetching with custom time',
      );
      req.body[0].interval = 900;
    }
  }

  const queryRequest = {queries: req.body};
  request.post(
    {
      url: chartUrl,
      body: JSON.stringify(queryRequest),
    },
    (err, httpResponse, body) => {
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

router.get('/stats_ta/:topology/:pattern', (req, res, next) => {
  const taUrl = BERINGEI_QUERY_URL + '/stats_typeahead';
  const taRequest = {
    topologyName: req.params.topology,
    input: req.params.pattern,
  };
  request.post(
    {
      url: taUrl,
      body: JSON.stringify(taRequest),
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

router.post(/\/scan_results$/i, (req, res) => {
  const topologyName = req.query.topology;
  dataJson.readScanResults(topologyName, res, req.body);
});

router.get(/\/self_test$/i, (req, res) => {
  const topologyName = req.query.topology;
  const filter = {};
  filter.filterType = req.query.filter.filterType;
  filter.testtime = req.query.filter.testtime;
  dataJson.readSelfTestResults(topologyName, res, filter);
});

// raw stats data
router.get(/\/link_analyzer\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  const analyzerData = getAnalyzerData(topologyName);
  if (analyzerData !== null) {
    res.send(analyzerData).end();
  } else {
    logger.debug('No analyzer cache found for: %s', topologyName);
    res.send('No analyzer cache').end();
  }
});

module.exports = router;
