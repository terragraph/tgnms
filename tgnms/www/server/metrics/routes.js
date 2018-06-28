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

const app = express();

// raw stats data
app.get(/\/overlay\/linkStat\/(.+)\/(.+)$/i, (req, res, next) => {
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
        console.error('Error fetching from beringei:', err);
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
app.post(/\/multi_chart\/$/i, (req, res, next) => {
  let httpPostData = '';
  req.on('data', chunk => {
    httpPostData += chunk.toString();
  });
  req.on('end', () => {
    // proxy query
    const chartUrl = BERINGEI_QUERY_URL + '/query';
    const httpData = JSON.parse(httpPostData);
    const queryRequest = {queries: httpData};
    request.post(
      {
        url: chartUrl,
        body: JSON.stringify(queryRequest),
      },
      (err, httpResponse, body) => {
        if (err) {
          console.error('Failed on /multi_chart', err);
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
});

app.get('/stats_ta/:topology/:pattern', (req, res, next) => {
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
        console.error('Error fetching from beringei:', err);
        res.status(500).end();
        return;
      }
      res.send(body).end();
    },
  );
});

// http://<address>/scan_results?topology=<topology name>&
//    filter[row_count]=<row_count>&
//    filter[offset]=<offset>&
//    filter[nodeFilter0]=<nodeFilter0>
//    filter[nodeFilter1]=<nodeFilter1>
// /i means ignore case
app.get(/\/scan_results$/i, (req, res) => {
  const topologyName = req.query.topology;
  const filter = {};
  filter.nodeFilter = [];
  filter.row_count = parseInt(req.query.filter.row_count, 10);
  filter.nodeFilter[0] = req.query.filter.nodeFilter0;
  filter.nodeFilter[1] = req.query.filter.nodeFilter1;
  filter.offset = parseInt(req.query.filter.offset, 10);
  dataJson.readScanResults(topologyName, res, filter);
});

// http://<address>/scan_results?topology=<topology name>&
//    filter[filterType]=<filter type>&
//    filter[testtime]=<test time>
//  filter type is "GROUPS" or "TESTRESULTS"
//  testtime is in ms (unix time)
// /i means ignore case
app.get(/\/self_test$/i, (req, res) => {
  const topologyName = req.query.topology;
  const filter = {};
  filter.filterType = req.query.filter.filterType;
  filter.testtime = req.query.filter.testtime;
  dataJson.readSelfTestResults(topologyName, res, filter);
});

// raw stats data
app.get(/\/link_analyzer\/(.+)$/i, (req, res, next) => {
  const topologyName = req.params[0];
  const analyzerData = getAnalyzerData(topologyName);
  if (analyzerData !== null) {
    res.send(analyzerData).end();
  } else {
    console.log('No analyzer cache found for', topologyName);
    res.send('No analyzer cache').end();
  }
});

module.exports = app;
