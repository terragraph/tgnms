/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import axios from 'axios';
import {STATS_DEFAULT_INTERVAL_SEC} from '../constants/StatsConstants';

type PrometheusLatestQueryProps = {
  topologyName: string,
  queryStart: string,
  queryEnd?: string,
  dsIntervalSec?: number,
};
/** Make a Prometheus request by link */
export const promQueryByLinkLatestRequest = (
  promQuery: PrometheusLatestQueryProps,
): Promise<any> => {
  // All apiservice requests are POST, and expect at least an empty dict.
  const data = Object.assign(
    {
      topologyName: '',
      queryStart: '',
      queryEnd: '',
      dsIntervalSec: STATS_DEFAULT_INTERVAL_SEC,
    },
    promQuery,
  );

  return axios.post(`/metrics/query/link/latest`, data);
};
