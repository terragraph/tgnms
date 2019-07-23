/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {promQueryByLinkLatestRequest} from '../apiutils/PrometheusAPIUtil';

export function fetchLinkIgnitionAttempts(
  networkName: string,
  intervalString: string,
) {
  return promQueryByLinkLatestRequest({
    topologyName: networkName,
    queryStart: 'increase(link_attempts',
    queryEnd: `[${intervalString}])`,
  });
}
