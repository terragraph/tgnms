/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';
import {useEffect, useState} from 'react';
import type {ApiUtil} from '@fbcnms/alarms/components/AlarmsApi';
import type {AxiosXHRConfig} from 'axios';

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
      url: `${AM_BASE_URL}/alert_config`,
      method: 'DELETE',
      params: {
        alert_name: ruleName,
      },
    }),

  // suppressions
  getSuppressions: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/silences`,
      method: 'GET',
    }),

  // receivers
  getReceivers: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/receivers`,
      method: 'GET',
    }),

  // routes
  getRoutes: _req =>
    makeRequest({
      url: `${AM_BASE_URL}/routes`,
      method: 'GET',
    }),
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

// TG Alarm Service
export const AlarmServiceAPIUrls = {
  getAlarmRules: () => `${AM_BASE_URL}/tg_rules`,
  addAlarmRule: () => `${AM_BASE_URL}/tg_rule_add`,
  delAlarmRule: (alarmName: string) =>
    `${AM_BASE_URL}/tg_rule_del?name=${encodeURIComponent(alarmName)}`,
};
