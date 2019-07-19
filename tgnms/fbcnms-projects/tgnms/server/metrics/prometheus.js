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

/** Query latest data and group by link name (and direction) */
function queryLatestByLink(
  topologyName: string,
  promQuery: string,
): Promise<any> {
  return new Promise((resolve, reject) => {
    request.post(
      {
        form: {query: promQuery},
        url: `${PROMETHEUS_URL}/api/v1/query`,
      },
      (err, httpResponse, _body) => {
        if (err) {
          return reject('Error fetching data');
        }
        // transform data
        return resolve(httpResponse.body);
      },
    );
  });
}

function flattenPrometheusResponse(httpResponse): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof httpResponse === 'object') {
      const promResults = [];
      httpResponse.forEach(response => {
        try {
          const promResponse = JSON.parse(response);
          if (promResponse.status !== 'success') {
            return reject('Failed fetching from prometheus');
          }
          promResponse.data.result.forEach(result => promResults.push(result));
        } catch (ex) {
          return reject('Failed parsing prometheus response from JSON');
        }
      });
      return resolve(promResults);
    } else {
      try {
        const promResponse = JSON.parse(httpResponse);
        if (promResponse.status !== 'success') {
          return reject('Failed fetching from prometheus');
        }
        return resolve(promResponse.data.result);
      } catch (ex) {
        return reject('Failed parsing prometheus response from JSON');
      }
    }
  });
}

function groupByLink(
  promRespList: object,
  topologyName: string,
  groupByLinkDirection: boolean = true,
): Promise<any> {
  // transform data into expected format
  return new Promise((resolve, reject) => {
    const networkState = getNetworkState(topologyName);
    if (
      !networkState ||
      !networkState.topology ||
      !networkState.topology.links
    ) {
      return reject('No topology cache');
    }
    // loop over link names in topology, converting characters
    // prometheus doesn't like
    const linkList = {};
    networkState.topology.links.forEach(link => {
      // map prometheus-acceptable name to real name
      linkList[formatPrometheusLabel(link.name)] = link.name;
    });
    const retMetricList = {};
    promRespList.forEach(promData => {
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
      // return a mapping of linkName -> value if no grouping
      if (!groupByLinkDirection) {
        retMetricList[realLinkName] = promData.value[1];
      } else {
        // group by link name, link direction, and metric name
        if (!retMetricList.hasOwnProperty(realLinkName)) {
          retMetricList[realLinkName] = {};
        }
        if (!retMetricList[realLinkName].hasOwnProperty(linkDirection)) {
          retMetricList[realLinkName][linkDirection] = {};
        }
        retMetricList[realLinkName][linkDirection][__name__] =
          promData.value[1];
      }
    });
    return resolve(retMetricList);
  });
}

const router = express.Router();

// query for latest value for a single metric across the network
router.get('/overlay/linkStat/:topologyName/:metricName', (req, res) => {
  const {metricName, topologyName} = req.params;
  const metricNameList = metricName.split(',');
  // query all metrics, flatten results (if needed), then return a result set
  Promise.all(
    metricNameList.map(metricName =>
      queryLatestByLink(
        topologyName,
        `${metricName}{network="${topologyName}",intervalSec="${DS_INTERVAL_SEC}"}`,
      ),
    ),
  )
    .then(flattenPrometheusResponse)
    .then(result => groupByLink(result, topologyName))
    .then(result => res.json(result).end());
});

// query for the latest data point only and format by link
router.post('/query/link/latest', (req, res) => {
  // split the query into parts to enforce network and intervalSec is set
  const {queryStart, topologyName, dsIntervalSec} = req.body;
  const queryEnd = req.body.queryEnd || '';
  const promQuery = `${queryStart}{network="${topologyName}",intervalSec="${dsIntervalSec}"}${queryEnd}`;
  queryLatestByLink(topologyName, promQuery)
    .then(flattenPrometheusResponse)
    .then(result =>
      groupByLink(result, topologyName, false /* groupByLinkDirection */),
    )
    .then(result => res.json(result).end())
    .catch(err =>
      res
        .status(500)
        .send(err)
        .end(),
    );
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

router.get('/list', (req, res) => {
  // get list of friendly metric names
  getLinkMetricList().then(metricList => {
    res.json(metricList).end();
  });
});

router.get('/search/:searchTerm', (req, res) => {
  // get list of friendly metric names
  getLinkMetricsByName(req.params.searchTerm).then(metricList => {
    res.json(metricList).end();
  });
});

module.exports = router;
