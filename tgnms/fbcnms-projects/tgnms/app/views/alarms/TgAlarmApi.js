/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import axios from 'axios';
import {useEffect, useState} from 'react';
import type {ApiRequest, ApiUtil} from '@fbcnms/alarms/components/AlarmsApi';
import type {AxiosXHRConfig} from 'axios';
import type {EventRule} from './eventalarms/EventAlarmsTypes';

export const AM_BASE_URL = '/api/alarms';
export const TgApiUtil: ApiUtil = {
  useAlarmsApi: useApi,
  viewFiringAlerts: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/alerts`,
    }),
  viewMatchingAlerts: ({expression, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/matching_alerts/${expression}`,
    }),
  createAlertRule: ({rule, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/alert_config`,
      method: 'POST',
      data: rule,
    }),
  editAlertRule: ({rule, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/alert_config/${rule.alert}`,
      data: rule,
      method: 'PUT',
    }),
  getAlertRules: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/alert_config`,
      method: 'GET',
    }),
  deleteAlertRule: ({ruleName, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/alert_config/${ruleName}`,
      method: 'DELETE',
    }),

  // suppressions
  getSuppressions: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/silences`,
      method: 'GET',
    }),

  // receivers
  createReceiver: ({receiver, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/receivers`,
      method: 'POST',
      data: receiver,
    }),
  editReceiver: ({receiver, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/receivers/${receiver.name}`,
      method: 'PUT',
      data: receiver,
    }),
  getReceivers: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/receivers`,
      method: 'GET',
    }),
  deleteReceiver: ({receiverName, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/receivers/${receiverName}`,
      method: 'DELETE',
    }),

  // routes
  getRouteTree: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/routes`,
      method: 'GET',
    }),
  editRouteTree: ({route, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/routes`,
      method: 'POST',
      data: route,
    }),

  //TODO RENAME
  // metric series

  getMetricNames: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/metric_names`,
      method: 'GET',
    }),
  getMetricSeries: ({name, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/metric_series/${name}`,
      method: 'GET',
    }),

  // global config
  getGlobalConfig: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/globalconfig`,
      method: 'GET',
    }),
  editGlobalConfig: ({config, networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/globalconfig`,
      method: 'POST',
      data: config,
    }),

  // Tenants
  getTenants: ({networkId}) =>
    makeRequest({url: `${AM_BASE_URL}/${networkId}/tenants`, method: 'GET'}),
  getAlertmanagerTenancy: ({networkId}) =>
    makeRequest({url: `${AM_BASE_URL}/${networkId}/am_tenancy`, method: 'GET'}),
  getPrometheusTenancy: ({networkId}) =>
    makeRequest({
      url: `${AM_BASE_URL}/${networkId}/prom_tenancy`,
      method: 'GET',
    }),
  getTroubleshootingLink: ({alertName: _}) => Promise.resolve(null),
};

export const TgEventAlarmsApiUtil = {
  getRules: ({networkId}: ApiRequest) =>
    makeRequest<void, Array<EventRule>>({
      url: `${AM_BASE_URL}/${networkId}/tg_rules`,
      method: 'GET',
      timeout: 3000,
    }),
  createAlertRule: ({networkId, rule}: {networkId: string, rule: EventRule}) =>
    makeRequest<EventRule, void>({
      url: `${AM_BASE_URL}/${networkId}/tg_rule_add`,
      method: 'POST',
      data: rule,
    }),
  deleteAlertRule: ({
    networkId,
    ruleName,
  }: {
    networkId: string,
    ruleName: string,
  }) => {
    return makeRequest<string, void>({
      url: `${AM_BASE_URL}/${networkId}/tg_rule_del?name=${encodeURIComponent(
        ruleName,
      )}`,
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
