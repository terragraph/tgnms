
const {BERINGEI_QUERY_URL} = require('../config');
const _ = require('lodash');
const request = require('request');

var analyzerData = {}; // cached results

function getAnalyzerData(topologyName) {
  return _.get(analyzerData, topologyName, null);
}

function refreshAnalyzerData (topologyName) {
  const linkMetrics = [
    {
      name: 'not_used',
      metric: 'fw_uptime',
      type: 'analyzer_table',
      min_ago: 60, /* 1 hour */
    },
    {
      name: 'not_used',
      metric: 'tx_ok',
      type: 'analyzer_table',
      min_ago: 60, /* 1 hour */
    },
    {
      name: 'not_used',
      metric: 'tx_fail',
      type: 'analyzer_table',
      min_ago: 60, /* 1 hour */
    },
    {
      name: 'not_used',
      metric: 'mcs',
      type: 'analyzer_table',
      min_ago: 60, /* 1 hour */
    },
    {
      name: 'not_used',
      metric: 'tx_power',
      type: 'analyzer_table',
      min_ago: 60, /* 1 hour */
    },
    {
      name: 'not_used',
      metric: 'snr',
      type: 'analyzer_table',
      min_ago: 60, /* 1 hour */
    },
  ];
  const startTime = new Date();
  const query = {
    topologyName: topologyName,
    nodeQueries: [],
    linkQueries: linkMetrics,
  };
  const chartUrl = BERINGEI_QUERY_URL + '/table_query';
  request.post(
    { url: chartUrl, body: JSON.stringify(query) },
    (err, httpResponse, body) => {
      if (err) {
        console.error('Error fetching from beringei:', err);
        return;
      }
      const totalTime = new Date() - startTime;
      console.log('Fetched analyzer data for', topologyName, 'in', totalTime, 'ms');
      let parsed;
      try {
        parsed = JSON.parse(httpResponse.body);
      } catch (ex) {
        console.error('Failed to parse json for analyzer data:', httpResponse.body);
        return;
      }
      analyzerData[topologyName] = parsed;
    }
  );
}

module.exports = {
  getAnalyzerData,
  refreshAnalyzerData,
};
