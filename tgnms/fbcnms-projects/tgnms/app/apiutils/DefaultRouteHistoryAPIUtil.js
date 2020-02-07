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
export const getDefaultRouteHistory = (
  inputData: DefaultRouteHistoryType,
): {[string]: Array<Array<string>>} => {
  return axios
    .get<
      DefaultRouteHistoryType,
      {data: {[string]: {[string]: Array<Array<string>>}}},
    >('/default_route_history/history', {
      params: {
        topologyName: inputData.networkName,
        nodeName: inputData.nodeName,
        startTime: inputData.startTime,
        endTime: inputData.endTime,
      },
    })
    .then(response => {
      return response.data[inputData.nodeName];
    })
    .catch(_err => {
      return undefined;
    });
};
