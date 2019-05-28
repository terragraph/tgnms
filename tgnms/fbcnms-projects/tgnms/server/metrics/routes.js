/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
import {
  GraphAggregation,
  StatsOutputFormat,
} from '../../thrift/gen-nodejs/Stats_types';

const {BERINGEI_QUERY_URL} = require('../config');
const {getAnalyzerData} = require('../topology/analyzer_data');
// new json writer
const express = require('express');
const request = require('request');
const logger = require('../log')(module);

const router = express.Router();

// raw stats data
router.post('/overlay/linkStat/:topologyName', (req, res, _next) => {
  const {topologyName} = req.params;
  const {metrics} = req.body;

  const linkQuery = {
    aggregation: GraphAggregation.LATEST,
    keyNames: metrics,
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

  // If the request window begin time is before 3 days, use the low frequency
  // database.
  /*if (req.body.length > 0) {
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
  }*/
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

router.post('/events', (req, res) => {
  const eventUrl = BERINGEI_QUERY_URL + '/events_query';

  request.post(
    {
      body: JSON.stringify(req.body),
      url: eventUrl,
    },
    (err, httpResponse, _body) => {
      if (err) {
        res
          .status(500)
          .send('Error fetching from beringei: ' + err)
          .end();
        return;
      }
      try {
        const parsed = JSON.parse(httpResponse.body);
        res.send(parsed).end();
      } catch (ex) {
        console.error('Failed to parse event json:', httpResponse.body);
        return;
      }
    },
  );
});

module.exports = router;
