/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {API_REQUEST_TIMEOUT, LOGIN_ENABLED} from '../config';
const logger = require('../log')(module);
import axios from 'axios';
import {PROXY_ENABLED} from '../config';
import {awaitClient} from '../user/oidc';
const isIp = require('is-ip');
import type {TokenSet} from 'openid-client';

export type BackgroundRequest = {
  isPrimaryController: boolean,
  networkName: string,
  ...Request,
};

export type Request = {|
  host: string,
  port: string | number,
  // TODO: rename this
  apiMethod: string,
  // axios request config
  config?: any,
  // json http body
  data: any,
  timeout?: number,
|};

export type AuthenticatedRequest = {
  accessToken: string,
  ...Request,
};

export class ApiServiceClient {
  serviceCredentials: ?TokenSet;

  /**
   * Makes an api service request on behalf of a user, sending their
   * access token as an authorization header
   */
  userRequest = async ({
    host,
    port,
    apiMethod,
    data,
    accessToken,
    timeout,
  }: AuthenticatedRequest) => {
    if (
      LOGIN_ENABLED &&
      (typeof accessToken !== 'string' || accessToken.trim() === '')
    ) {
      throw new Error('missing access token for user request');
    }
    return await this._makeApiRequest({
      host,
      port,
      apiMethod,
      data,
      accessToken,
      config: {timeout: timeout ?? API_REQUEST_TIMEOUT},
    });
  };

  /**
   * Make a single background request outside of the context of a user action,
   * uses the nms's service token to access apiservice instead of
   * a user's access_token.
   **/
  backgroundRequest = async ({
    networkName,
    isPrimaryController,
    host,
    port,
    apiMethod,
    data,
    config,
  }: BackgroundRequest) => {
    // Backward compatibility
    if (!host) {
      return Promise.reject();
    }

    const postData = data || {};
    const configData = config || {timeout: API_REQUEST_TIMEOUT};
    const request = {
      networkName,
      isPrimaryController,
      host,
      port,
      apiMethod,
      postData,
      configData,
    };

    const startTimer = new Date();

    try {
      const requestConfig = {
        headers: {},
        ...configData,
      };
      let accessToken = '';
      if (LOGIN_ENABLED) {
        const credentials = await this.loadServiceCredentials();
        accessToken = credentials.access_token;
      }
      const response = await this._makeApiRequest({
        host,
        port,
        apiMethod,
        accessToken,
        data: postData,
        config: requestConfig,
      });
      const responseTime = new Date() - startTimer;
      return {
        request,
        success: true,
        responseTime,
        data: response.data,
      };
    } catch (error) {
      const endTimer = new Date();
      const responseTime = endTimer - startTimer;
      const data = error.response ? error.response.data : null;
      return {
        request,
        success: false,
        responseTime,
        data,
        error,
      };
    }
  };

  _makeApiRequest = async ({
    host,
    port,
    apiMethod,
    data,
    accessToken,
    config = {},
  }: AuthenticatedRequest) => {
    const baseUrl = formatApiServiceBaseUrl(host, port);
    const apiUrl = `${baseUrl}/api/${apiMethod}`;
    const requestConfig = {
      headers: {},
      ...config,
    };
    if (LOGIN_ENABLED) {
      requestConfig.headers.Authorization = `Bearer ${accessToken}`;
    }
    try {
      const response = await axios.post<any, any>(apiUrl, data, requestConfig);
      return response;
    } catch (error) {
      if (error.response) {
        logger.debug(
          `received status ${error.response.status} for url ${apiUrl}`,
        );
      }
      throw error;
    }
  };

  /**
   * Loads and caches the NMS's service account credentials. This function is
   * called automatically by backgroundRequest. If you are making a batch of
   * background requests, directly call this function before the batch to cache
   * the service credentials. This will prevent race conditions related to the
   * tokens
   **/
  loadServiceCredentials = async (): Promise<TokenSet> => {
    if (!this.serviceCredentials) {
      logger.debug('loading service credentials');
      this.serviceCredentials = await this._requestServiceCredentials();
    } else if (this.serviceCredentials.expired()) {
      logger.debug('refreshing service credentials');
      this.serviceCredentials = await this._refreshServiceCredentials();
    }
    if (!this.serviceCredentials) {
      throw new Error('could not load service credentials');
    }
    return this.serviceCredentials;
  };

  // "Login" this service account
  _requestServiceCredentials = (): Promise<TokenSet> => {
    return awaitClient().then(client =>
      client.grant({
        grant_type: 'client_credentials',
      }),
    );
  };

  // Refresh this service account's credentials
  _refreshServiceCredentials = async (): Promise<TokenSet> => {
    if (!this.serviceCredentials) {
      throw new Error('No cached credentials to refresh');
    }
    const refreshToken = this.serviceCredentials.refresh_token;
    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }
    const client = await awaitClient();
    try {
      const refreshed = await client.refresh(refreshToken);
      return refreshed;
    } catch (error) {
      // could not refresh service credentials, refresh token may have expired
      return await this._requestServiceCredentials();
    }
  };
}

function formatApiServiceBaseUrl(host, port) {
  if (PROXY_ENABLED && isIp.v6(host)) {
    // special case, proxy doesn't handle ipv6 addresses correctly
    return `http://[[${host}]]:${port}`;
  }
  return isIp.v6(host) ? `http://[${host}]:${port}` : `http://${host}:${port}`;
}

const defaultClient = new ApiServiceClient();
export default defaultClient;
