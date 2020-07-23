/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import axios from 'axios';
import {apiServiceRequest} from '../apiutils/ServiceAPIUtil';

/**
 * Gets the default route history
 */
export type DefaultRouteHistoryType = {
  networkName: string,
  nodeName: string,
  startTime: string,
  endTime: string,
};

export type DefaultRouteUtilType = {
  routes: Array<Array<string>>,
  percentage: number,
};

type DefaultRouteHistory = {
  history: {[string]: Array<DefaultRouteHistoryData>},
  util: {[string]: Array<DefaultRouteUtilType>},
};

export type DefaultRouteHistoryData = {
  last_updated: string,
  routes: Array<Array<string>>,
  max_hop_count: number,
};

export const getDefaultRouteHistory = (inputData: DefaultRouteHistoryType) => {
  return axios
    .get<DefaultRouteHistoryType, DefaultRouteHistory>(
      '/default_route_history/history',
      {
        params: {
          networkName: inputData.networkName,
          nodeName: inputData.nodeName,
          startTime: inputData.startTime,
          endTime: inputData.endTime,
        },
      },
    )
    .then(response => {
      return {
        history: response.data.history[inputData.nodeName],
        utils: response.data.util[inputData.nodeName],
      };
    })
    .catch(_err => {
      return undefined;
    });
};

export function currentDefaultRouteRequest({
  networkName,
  selectedNode,
}: {
  networkName: string,
  selectedNode: string,
}): Promise<Array<Array<string>>> {
  const data = {nodes: [selectedNode]};

  return apiServiceRequest(networkName, 'getDefaultRoutes', data)
    .then(response => {
      const defaultRoute = response.data.defaultRoutes[selectedNode];
      return defaultRoute;
    })
    .catch(_error => {
      return [];
    });
}
