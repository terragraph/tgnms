/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {promQueryByLinkLatestRequest} from '../apiutils/PrometheusAPIUtil';
import {STATS_DEFAULT_INTERVAL_SEC} from '../constants/StatsConstants';

export function fetchLinkIgnitionAttempts(
  networkName: string,
  intervalString: string,
) {
  return promQueryByLinkLatestRequest(
    networkName,
    'increase(link_attempts',
    `[${intervalString}])`,
    STATS_DEFAULT_INTERVAL_SEC,
  );
}
