/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
const {DS_INTERVAL_SEC, PROMETHEUS_URL} = require('../config');
const {
  formatPrometheusLabel,
  getLinkMetricList,
  getLinkMetricsByName,
} = require('./metrics');
// new json writer
const express = require('express');
const request = require('request');
const logger = require('../log')(module);
const moment = require('moment');

const {getNetworkState} = require('../topology/model');

const router = express.Router();

router.get('/list', (req, res) => {
  // get list of friendly metric names
  getLinkMetricList().then(metricList => {
    res.json(metricList).end();
  });
});

// raw stats data
router.get('/overlay/linkStat/:topologyName/:metricName', (req, res) => {
  const {metricName, topologyName} = req.params;

  const promQuery = {
    query: `${metricName}{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}`,
  };
  request.post(
    {
      form: promQuery,
      url: `${PROMETHEUS_URL}/api/v1/query`,
    },
    (err, httpResponse, _body) => {
      if (err) {
        logger.error('Error fetching from prometheus: %s', err);
        res
          .status(500)
          .send('Error fetching data')
          .end();
        return;
      }
      // transform data into expected format
      try {
        const promResp = JSON.parse(httpResponse.body);
        if (
          promResp.data &&
          promResp.data.result &&
          typeof promResp.data.result === 'object'
        ) {
          const networkState = getNetworkState(topologyName);
          if (
            !networkState ||
            !networkState.topology ||
            !networkState.topology.links
          ) {
            logger.error('No topology for:', topologyName);
            res.status(500).end();
            return;
          }
          // loop over link names in topology, converting characters
          // prometheus doesn't like
          const linkList = {};
          networkState.topology.links.forEach(link => {
            // map prometheus-acceptable name to real name
            linkList[formatPrometheusLabel(link.name)] = link.name;
          });
          const retMetricList = {};
          promResp.data.result.forEach(promData => {
            const {linkName, linkDirection, __name__} = promData.metric;
            // match prometheus link names
            if (!linkList.hasOwnProperty(linkName)) {
              logger.debug(
                'Unable to match prometheus link name in topology: ',
                linkName,
              );
              return;
            }
            const realLinkName = linkList[linkName];
            if (!retMetricList.hasOwnProperty(realLinkName)) {
              retMetricList[realLinkName] = {};
            }
            if (!retMetricList[realLinkName].hasOwnProperty(linkDirection)) {
              retMetricList[realLinkName][linkDirection] = {};
            }
            retMetricList[realLinkName][linkDirection][__name__] =
              promData.value[1];
          });
          res.send(retMetricList).end();
          return;
        }
        res.status(500).end();
      } catch (ex) {
        logger.error('Failed to parse prometheus json:', httpResponse.body);
        res.status(500).end();
        return;
      }
    },
  );
});

router.get('/search/:searchTerm', (req, res) => {
  // get list of friendly metric names
  getLinkMetricsByName(req.params.searchTerm).then(metricList => {
    res.json(metricList).end();
  });
});

router.post('/query', (req, res) => {
  const {metricName, topologyName, dsIntervalSec, minAgo} = req.body;
  const startTsSec = moment()
    .subtract(minAgo, 'minutes')
    .unix();
  const endTsSec = moment().unix();
  const promReq = {
    query: `${metricName}{network="${topologyName}",intervalSec="${dsIntervalSec}"}`,
    start: startTsSec,
    end: endTsSec,
    step: dsIntervalSec,
  };
  request.post(
    {
      form: promReq,
      url: `${PROMETHEUS_URL}/api/v1/query_range`,
    },
    (err, httpResponse, _body) => {
      if (err) {
        res.status(500).end();
        return;
      }
      try {
        const parsed = JSON.parse(httpResponse.body);
        res.send(parsed).end();
      } catch (ex) {
        logger.error('Failed to parse prometheus json:', httpResponse.body);
        res.status(500).end();
        return;
      }
    },
  );
});

module.exports = router;
