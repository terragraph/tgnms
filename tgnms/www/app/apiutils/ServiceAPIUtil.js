/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import axios from 'axios';

type E2EAck = {
  message: string,
  statusText: string,
};

export const apiServiceRequest = (
  topologyName: string,
  apiMethod: string,
  data: Object = {},
  config: Object = {},
) => {
  // All apiservice requests are POST, and expect at least an empty dict.
  return new Promise((resolve, reject) => {
    axios
      .post(
        `/apiservice/${topologyName}/default/api/${apiMethod}`,
        data,
        config,
      )
      .then(response => {
        // NOTE: Until the API Service doesn't send 200s on failure, we need to check for a success flag
        if (response.data.hasOwnProperty('success')) {
          if (response.data.success) {
            resolve(response);
          } else {
            reject({response, message: response.data.message});
          }
        } else {
          resolve(response);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
};

export const getErrorTextFromE2EAck = (error: ?E2EAck) => {
  if (!error) {
    return 'Unknown Error!';
  }

  // try to get the message from the API response, otherwise, default to the response
  return error.message ? error.message : error.statusText;
};
