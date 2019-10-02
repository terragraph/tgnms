/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {ExpressRequest} from 'express';
import type {OpenidClient} from './oidcTypes';

import User from './User';
import axios from 'axios';
import {ERROR_KEYS, createExpectedError, isSocketTimeoutError} from './errors';
import {KEYCLOAK_HOST, KEYCLOAK_REALM} from '../config';
import {TokenSet} from 'openid-client';

const logger = require('../log')(module);

type EnsureAccessTokenParams = {
  resolveClient: (req: any) => Promise<?OpenidClient>,
  resolveUserFromTokenSet: (req: any, tokenSet: TokenSet) => Promise<any>,
};

/**
 * Checks the user's session for a valid access token. If the token is stale, it
 * will be refreshed. If it cannot be refreshed, an error will be returned to
 * the callsite's promise chain
 */
export default async function ensureAccessToken(
  req: any,
  params: EnsureAccessTokenParams,
): Promise<any> {
  const {resolveClient, resolveUserFromTokenSet} = params;
  const openidClient = await resolveClient(req);
  if (!openidClient) {
    throw createExpectedError(ERROR_KEYS.remoteDown);
  }

  try {
    const apiTokenUser = await getApiTokenSet(req);
    if (apiTokenUser) {
      await asyncLogin(req, apiTokenUser);
      return apiTokenUser;
    }
  } catch (e) {
    // swallow the error and continue to passport authentication
  }

  const passportUser = req.session?.passport?.user;
  if (!passportUser) {
    throw createExpectedError(ERROR_KEYS.noSession);
  }
  const tokenSet = new TokenSet(passportUser);
  if (!tokenSet.expired()) {
    return tokenSet;
  }

  logger.info(`refreshing expired access token`);
  // refresh also validates the token
  try {
    const refreshed = await openidClient.refresh(tokenSet.refresh_token);
    logger.info(`access token refreshed`);
    const user = await resolveUserFromTokenSet(req, refreshed);
    await asyncLogin(req, user);
    return refreshed;
  } catch (error) {
    console.dir(error);
    if (error.name === 'OpenIdConnectError') {
      /**
       * If we receive an invalid grant error during refresh, the token has
       * expired. The user must login again.
       */
      if (error.error === 'invalid_grant') {
        throw createExpectedError(ERROR_KEYS.noSession);
      }
      logger.error(error);
      throw createExpectedError(ERROR_KEYS.generic);
    }
    if (isSocketTimeoutError(error)) {
      throw createExpectedError(ERROR_KEYS.remoteDown);
    }
    throw createExpectedError(ERROR_KEYS.generic);
  }
}

function asyncLogin(req: any, user: any): Promise<any> {
  return new Promise((resolve, reject) => {
    req.logIn(user, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

/*
 * Retrieves a user's authorization info from a bearer token. Validates the
 * token before resolving. This does not handle token refresh
 */
async function getApiTokenSet(req: ExpressRequest): Promise<User> {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return Promise.reject(new Error('Missing Authorization header'));
  }
  if (authHeader.indexOf('Bearer ') === -1) {
    return Promise.reject(new Error('Malformed Authorization header'));
  }
  if (!(KEYCLOAK_HOST && KEYCLOAK_REALM)) {
    return Promise.reject(new Error('Invalid keycloak configuration'));
  }
  const response = await axios({
    method: 'GET',
    url: `${KEYCLOAK_HOST}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
    headers: {
      Authorization: authHeader,
    },
  });
  return response.data;
}
