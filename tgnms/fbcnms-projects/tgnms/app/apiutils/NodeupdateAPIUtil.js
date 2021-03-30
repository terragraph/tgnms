/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';

/** Make a nodeupdate server request. */
export const nodeupdateServerRequest = (
  apiMethod: string,
  data: Object,
  config?: {}, //no current call of nodeupdateServerRequest declares config
): Promise<any> => {
  // All nodeupdate requests are POST, and expect at least an empty dict.
  return new Promise((resolve, reject) => {
    axios
      .post(`/nodeupdateservice/${apiMethod}`, data, config)
      .then(resolve)
      .catch(reject);
  });
};
