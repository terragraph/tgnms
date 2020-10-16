/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import axios from 'axios';
import {useEffect, useState} from 'react';
import type {ApiUtil} from '@fbcnms/alarms/components/AlarmsApi';
import type {AxiosXHRConfig} from 'axios';
import type {EventRule} from './eventalarms/EventAlarmsTypes';

export const AM_BASE_URL = '/alarms';
export const TgApiUtil: ApiUtil = {
  useAlarmsApi: useApi,
  viewFiringAlerts: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/alerts`,
    }),
  viewMatchingAlerts: ({expression}) =>
    makeRequest({url: `${AM_BASE_URL}/matching_alerts/${expression}`}),
  createAlertRule: ({rule}) =>
    makeRequest({
      url: `${AM_BASE_URL}/alert_config`,
      method: 'POST',
      data: rule,
    }),
  editAlertRule: ({rule}) =>
    makeRequest({
      url: `${AM_BASE_URL}/alert_config/${rule.alert}`,
      data: rule,
      method: 'PUT',
    }),
  getAlertRules: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/alert_config`,
      method: 'GET',
    }),
  deleteAlertRule: ({ruleName}) =>
    makeRequest({
      url: `${AM_BASE_URL}/alert_config/${ruleName}`,
      method: 'DELETE',
    }),

  // suppressions
  getSuppressions: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/silences`,
      method: 'GET',
    }),

  // receivers
  createReceiver: ({receiver}) =>
    makeRequest({
      url: `${AM_BASE_URL}/receivers`,
      method: 'POST',
      data: receiver,
    }),
  editReceiver: ({receiver}) =>
    makeRequest({
      url: `${AM_BASE_URL}/receivers/${receiver.name}`,
      method: 'PUT',
      data: receiver,
    }),
  getReceivers: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/receivers`,
      method: 'GET',
    }),
  deleteReceiver: ({receiverName}) =>
    makeRequest({
      url: `${AM_BASE_URL}/receivers/${receiverName}`,
      method: 'DELETE',
    }),

  // routes
  getRouteTree: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/routes`,
      method: 'GET',
    }),
  editRouteTree: req =>
    makeRequest({
      url: `${AM_BASE_URL}/routes`,
      method: 'POST',
      data: req.route,
    }),

  // metric series
  getMetricSeries: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/metric_series`,
      method: 'GET',
    }),

  // global config
  getGlobalConfig: _req =>
    makeRequest({url: `${AM_BASE_URL}/globalconfig`, method: 'GET'}),
  editGlobalConfig: ({config}) =>
    makeRequest({
      url: `${AM_BASE_URL}/globalconfig`,
      method: 'POST',
      data: config,
    }),

  // Tenants
  getTenants: _req =>
    makeRequest({url: `${AM_BASE_URL}/tenants`, method: 'GET'}),
  getAlertmanagerTenancy: _req =>
    makeRequest({url: `${AM_BASE_URL}/am_tenancy`, method: 'GET'}),
  getPrometheusTenancy: _req =>
    makeRequest({url: `${AM_BASE_URL}/prom_tenancy`, method: 'GET'}),
};

export const TgEventAlarmsApiUtil = {
  getRules: () =>
    makeRequest<void, Array<EventRule>>({
      url: `${AM_BASE_URL}/tg_rules`,
      method: 'GET',
      timeout: 3000,
    }),
  createAlertRule: (rule: EventRule) =>
    makeRequest<EventRule, void>({
      url: `${AM_BASE_URL}/tg_rule_add`,
      method: 'POST',
      data: rule,
    }),
  deleteAlertRule: ({ruleName}: {ruleName: string}) => {
    return makeRequest<string, void>({
      url: `${AM_BASE_URL}/tg_rule_del?name=${encodeURIComponent(ruleName)}`,
      method: 'POST',
    });
  },
};

function useApi<TParams: {...}, TResponse>(
  func: TParams => Promise<TResponse>,
  params: TParams,
  cacheCounter?: string | number,
): {
  response: ?TResponse,
  error: ?Error,
  isLoading: boolean,
} {
  const [response, setResponse] = useState();
  const [error, setError] = useState<?Error>(null);
  const [isLoading, setIsLoading] = useState(true);
  const jsonParams = JSON.stringify(params);

  useEffect(() => {
    async function makeRequest() {
      try {
        const parsed = JSON.parse(jsonParams);
        setIsLoading(true);
        const res = await func(parsed);
        setResponse(res);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        setError(err);
        setResponse(null);
        setIsLoading(false);
      }
    }
    makeRequest();
  }, [jsonParams, func, cacheCounter]);

  return {
    error,
    response,
    isLoading,
  };
}

async function makeRequest<TParams, TResponse>(
  axiosConfig: AxiosXHRConfig<TParams, TResponse>,
): Promise<TResponse> {
  const response = await axios(axiosConfig);
  return response.data;
}
