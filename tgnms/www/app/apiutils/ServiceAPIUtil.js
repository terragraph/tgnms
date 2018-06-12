/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';

export const apiServiceRequest = (
  topologyName: string,
  apiMethod: string,
  data: Object = {},
  config: Object = {},
) => {
  // All apiservice requests are POST, and expect at least an empty dict.
  return axios.post(
    `/apiservice/${topologyName}/api/${apiMethod}`,
    data,
    config,
  );
};
