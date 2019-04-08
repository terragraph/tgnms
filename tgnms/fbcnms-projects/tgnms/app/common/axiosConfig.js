/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import axios from 'axios';
/**
 * Allows serverside to distinguish between ajax requests and regular http
 * requests via express's req.xhr property.
 */
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
/**
 * if the server returns a 401 with a redirectUrl in the body, the user needs
 * to sign in again
 */
axios.interceptors.response.use(response => response, function(error) {
  if (
    error.response &&
    error.response.status === 401 &&
    error.response.data &&
    error.response.data.redirectUrl
  ) {
    window.location = error.response.data.redirectUrl;
    return;
  }
  // Do something with response error
  return Promise.reject(error);
});
