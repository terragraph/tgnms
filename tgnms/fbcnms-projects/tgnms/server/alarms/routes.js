/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {
  ALERTMANAGER_CONFIG_URL,
  ALERTMANAGER_URL,
  PROMETHEUS_CONFIG_URL,
  PROMETHEUS_URL,
  TG_ALARM_URL,
} from '../config';
import {Api} from '../Api';
import {createErrorHandler, createRequest} from '../helpers/apiHelpers';
import {getNetworkState} from '../topology/model';
const {queryLatest} = require('../metrics/prometheus');
import type {NetworkState} from '@fbcnms/tg-nms/shared/dto/NetworkState';

export default class AlarmsRoutes extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    router.get('/:networkName/alerts', (req, res) =>
      createRequest({
        uri: formatAlertManagerUrl(req.params.networkName, `/api/v1/alerts`),
        method: req.method,
      })
        .then(response => {
          if (response.statusCode !== 200) {
            return res.status(response.statusCode).send(response.statusText);
          }
          return res
            .status(response.statusCode)
            .send(JSON.parse(response.body)?.data);
        })
        .catch(createErrorHandler(res)),
    );

    router.get('/:networkName/silences', (req, res) =>
      createRequest({
        uri: formatAlertManagerUrl(req.params.networkName, `/api/v1/silences`),
        method: req.method,
      })
        .then(response =>
          res.status(response.statusCode).send(JSON.parse(response.body)?.data),
        )
        .catch(createErrorHandler(res)),
    );

    router.post('/:networkName/alert_config', (req, res) => {
      const params = {
        uri: formatPrometheusConfigUrl(req.params.networkName, `/alert`),
        method: req.method,
        json: req.body,
      };
      return createRequest(params)
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.put('/:networkName/alert_config/:alertName', (req, res) => {
      const {alertName} = req.params;
      if (!alertName) {
        return res.status(400).json({error: 'invalid alertName'});
      }
      const params = {
        uri: formatPrometheusConfigUrl(
          req.params.networkName,
          `/alert/${alertName}`,
        ),
        method: req.method,
        json: req.body,
      };
      return createRequest(params)
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.delete('/:networkName/alert_config/:alertName', (req, res) => {
      const params = {
        uri: formatPrometheusConfigUrl(
          req.params.networkName,
          `/alert/${encodeURLParam(req.params.alertName)}`,
        ),
        method: req.method,
        qs: req.query,
      };
      return createRequest(params)
        .then(response => {
          if (response.statusCode !== 200) {
            return res.status(response.statusCode).send(response.body);
          }
          return res.status(response.statusCode).send(response.body);
        })
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/alert_config', (req, res) => {
      const params = {
        uri: formatPrometheusConfigUrl(req.params.networkName, `/alert`),
        method: req.method,
        qs: req.query,
      };
      return createRequest(params)
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/receivers', (req, res) =>
      createRequest({
        uri: formatAlertManagerConfigUrl(req.params.networkName, `/receiver`),
        method: req.method,
        qs: req.query,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res)),
    );
    router.post('/:networkName/receivers', (req, res) =>
      createRequest({
        uri: formatAlertManagerConfigUrl(req.params.networkName, `/receiver`),
        method: req.method,
        json: req.body,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res)),
    );

    router.put('/:networkName/receivers/:name', (req, res) =>
      createRequest({
        uri: formatAlertManagerConfigUrl(
          req.params.networkName,
          `/receiver/${req.params.name}`,
        ),
        method: req.method,
        json: req.body,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res)),
    );

    router.delete('/:networkName/receivers/:name', (req, res) =>
      createRequest({
        uri: formatAlertManagerConfigUrl(
          req.params.networkName,
          `/receiver/${encodeURLParam(req.params.name)}`,
        ),
        method: req.method,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res)),
    );

    router.get('/:networkName/routes', (req, res) =>
      createRequest({
        uri: formatAlertManagerConfigUrl(req.params.networkName, `/route`),
        method: req.method,
        qs: req.query,
      })
        .then(response => {
          return res.status(response.statusCode).send(response.body);
        })
        .catch(createErrorHandler(res)),
    );

    router.post('/:networkName/routes', (req, res) =>
      createRequest({
        uri: formatAlertManagerConfigUrl(req.params.networkName, `/route`),
        method: req.method,
        json: req.body,
      })
        .then(response => {
          return res.status(response.statusCode).send(response.body);
        })
        .catch(createErrorHandler(res)),
    );

    router.get('/:networkName/tg_rules', (req, res) =>
      createRequest({
        uri: formatTgAlarmServiceUrl(req.params.networkName, `/rules`),
        method: req.method,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res)),
    );

    router.post('/:networkName/tg_rule_add', (req, res) =>
      createRequest({
        uri: formatTgAlarmServiceUrl(req.params.networkName, `/add_rule`),
        method: req.method,
        json: req.body,
      })
        .then(response => {
          return res.status(response.statusCode).send(response.body);
        })
        .catch(createErrorHandler(res)),
    );

    router.post('/:networkName/tg_rule_del', (req, res) =>
      createRequest({
        uri: formatTgAlarmServiceUrl(req.params.networkName, `/del_rule`),
        method: req.method,
        qs: req.query,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res)),
    );

    // matching alerts (count only)
    router.get('/:networkName/matching_alerts/:alertExpr', (req, res) => {
      const networkName = req.params.networkName;
      queryLatest({query: `count(${req.params.alertExpr})`}, networkName)
        .then(response => res.status(200).send(response))
        .catch(createErrorHandler(res));
    });

    router.post('/:networkName/globalconfig', (req, res) => {
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.alertmanager_config_url,
        ALERTMANAGER_CONFIG_URL,
      );
      return createRequest({
        uri: `${baseUrl}/v1/global`,
        method: req.method,
        json: req.body,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/globalconfig', (req, res) => {
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.alertmanager_config_url,
        ALERTMANAGER_CONFIG_URL,
      );
      return createRequest({
        uri: `${baseUrl}/v1/global`,
        method: req.method,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/tenants', (req, res) => {
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.alertmanager_config_url,
        ALERTMANAGER_CONFIG_URL,
      );
      return createRequest({
        uri: `${baseUrl}/v1/tenants`,
        method: req.method,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/am_tenancy', (req, res) => {
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.alertmanager_config_url,
        ALERTMANAGER_CONFIG_URL,
      );
      return createRequest({
        uri: `${baseUrl}/v1/tenancy`,
        method: req.method,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/prom_tenancy', (req, res) => {
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.prometheus_config_url,
        PROMETHEUS_CONFIG_URL,
      );
      return createRequest({
        uri: `${baseUrl}/v1/tenancy`,
        method: req.method,
      })
        .then(response => res.status(response.statusCode).send(response.body))
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/metric_names', (req, res) => {
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.prometheus_url,
        PROMETHEUS_URL,
      );
      return createRequest({
        uri: `${baseUrl}/api/v1/label/__name__/values`,
        method: 'GET',
      })
        .then(response => {
          if (response.statusCode !== 200) {
            return res.status(response.statusCode).send(response.body);
          }
          return res
            .status(response.statusCode)
            .send(JSON.parse(response.body).data);
        })
        .catch(createErrorHandler(res));
    });

    router.get('/:networkName/metric_series/:name', (req, res) => {
      let startTimeString: string;
      if (typeof req.query.start === 'string') {
        startTimeString = req.query.start;
      } else {
        /**
         * prom's series endpoint will only show metric series which were active
         * during the time interval. If no interval is provided, it will default
         * to the most recent scrape so offset by a large amount of time to get
         * all the metrics series.
         */
        const METRIC_SERIES_DATE_OFFSET = 1;
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - METRIC_SERIES_DATE_OFFSET);
        startTimeString = startTime.toISOString();
      }
      const baseUrl = getNetworkProperty(
        req.params.networkName,
        state => state.prometheus_url,
        PROMETHEUS_URL,
      );
      return createRequest({
        uri: `${baseUrl}/api/v1/series?start=${startTimeString}&match[]={__name__="${req.params.name}"}`,
        method: 'GET',
      })
        .then(response => {
          if (response.statusCode !== 200) {
            return res.status(response.statusCode).send(response.body);
          }
          return res
            .status(response.statusCode)
            .send(JSON.parse(response.body).data);
        })
        .catch(createErrorHandler(res));
    });
    return router;
  }
}

function formatPrometheusConfigUrl(networkName: string, uri: string) {
  const baseUrl = getNetworkProperty(
    networkName,
    state => state.prometheus_config_url,
    PROMETHEUS_CONFIG_URL,
  );
  return `${baseUrl}/v1/tg${uri}`;
}

function formatAlertManagerUrl(networkName: string, uri: string) {
  const baseUrl = getNetworkProperty(
    networkName,
    state => state.alertmanager_url,
    ALERTMANAGER_URL,
  );
  return `${baseUrl}${uri}`;
}

function formatAlertManagerConfigUrl(networkName: string, uri: string) {
  const baseUrl = getNetworkProperty(
    networkName,
    state => state.alertmanager_config_url,
    ALERTMANAGER_CONFIG_URL,
  );
  return `${baseUrl}/v1/tg${uri}`;
}

function formatTgAlarmServiceUrl(networkName: string, uri: string) {
  const baseUrl = getNetworkProperty(
    networkName,
    state => state.event_alarm_url,
    TG_ALARM_URL,
  );
  return `${baseUrl}${uri}`;
}

function getNetworkProperty(
  networkName,
  getProp: NetworkState => ?string,
  fallback: string,
) {
  const state = getNetworkState(networkName);
  if (state == null) {
    return fallback;
  }
  const prop = getProp(state);
  if (prop != null && prop.trim() !== '') {
    return prop;
  }
  return fallback;
}

function encodeURLParam(str) {
  return encodeURIComponent(str).replace(/[()]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}
