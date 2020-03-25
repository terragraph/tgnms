/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

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
    const url = new URL(error.response.data.redirectUrl);
    /**
     * Whenever an unauthenticated request is received, the useragent is
     * instructed to redirect to the login page. The redirect contains a url
     * parameter with the original url, that way the user is redirected back to
     * their originally intended url after signin. This is good for direct
     * browsing / link clicking, but bad for ajax. The old behavior redirected
     * the useragent to the ajax url. After login, the user would be redirected
     * to /topology/list for example (and the user would see JSON after logging
     * in).The correct behavior is for the axios interceptor to override the
     * return url with the useragent's current location (window.location.href).
     */
    url.searchParams.set('returnUrl', window.location.href);
    window.location = url;
    return;
  }
  // Do something with response error
  return Promise.reject(error);
});
