/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';

/** Make a Prometheus request by link */
export const promQueryByLinkLatestRequest = (
  topologyName: string,
  queryStart: string,
  queryEnd: string = '',
  dsIntervalSec: number = 30,
): Promise<any> => {
  // All apiservice requests are POST, and expect at least an empty dict.
  const data = {
    topologyName,
    queryStart,
    queryEnd,
    dsIntervalSec,
  };
  return axios.post(`/metrics/query/link/latest`, data);
};
