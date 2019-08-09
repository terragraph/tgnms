/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import axios from 'axios';

/** Make a nodeupdate server request. */
export const nodeupdateServerRequest = (
  apiMethod: string,
  data: Object = {},
  config: Object = {},
): Promise<any> => {
  // All nodeupdate requests are POST, and expect at least an empty dict.
  return new Promise((resolve, reject) => {
    axios
      .post(`/nodeupdateservice/${apiMethod}`, data, config)
      .then(resolve)
      .catch(reject);
  });
};
