/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import axios from 'axios';
/**
 * Gets the default route history
 */
export type DefaultRouteHistoryType = {
  networkName: string,
  nodeName: string,
  startTime: string,
  endTime: string,
};

type DefaultRouteHistory = {
  history: {[string]: Array<DefaultRouteHistoryData>},
  util: {[string]: {[string]: number}},
};

export type DefaultRouteHistoryData = {
  last_updated: string,
  routes: Array<Array<string>>,
  hop_count: number,
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
        util: response.data.util[inputData.nodeName],
      };
    })
    .catch(_err => {
      return undefined;
    });
};
