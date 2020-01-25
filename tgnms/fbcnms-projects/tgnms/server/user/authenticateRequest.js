/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import User from './User';
import {ERROR_KEYS, createExpectedError, isSocketTimeoutError} from './errors';
import {JWS} from 'node-jose';
import {KEYCLOAK_HOST, KEYCLOAK_REALM} from '../config';
import {TokenSet} from 'openid-client';
import {awaitClient} from '../user/oidc';
import {isExpectedError} from './errors';

import type {AccessToken} from './oidcTypes';
import type {Client as OpenidClient} from 'openid-client';
import type {Request} from '../types/express';
import type {User as UserDto} from '../../shared/auth/User';
const logger = require('../log')(module);

/**
 * Decide which authentication scheme to use for the request,
 * verify and resolve the user. If authentication fails, an error is thrown
 */
export async function authenticateRequest(req: Request): Promise<UserDto> {
  let user: ?UserDto = null;
  const openidClient = await awaitClient();
  if (!openidClient) {
    throw createExpectedError(ERROR_KEYS.remoteDown);
  }
  if (req.header('Authorization')) {
    user = await authenticateApiTokenUser(req, openidClient);
  } else {
    user = await authenticateSessionUser(req, openidClient);
  }
  if (!user) {
    throw createExpectedError(ERROR_KEYS.noSession);
  }
  return user;
}

export async function authenticateSessionUser(
  req: Request,
  openidClient: OpenidClient,
): Promise<UserDto> {
  try {
    // user info is stored as a JWT in the cookie session
    const passportSession = req.session?.passport?.user;
    if (!passportSession) {
      throw createExpectedError(ERROR_KEYS.noSession);
    }

    // parse the JWT from session and ensure it's still valid
    const tokenSet = new TokenSet(passportSession);
    if (!tokenSet.expired() && req.user) {
      return req.user;
    }
    // token is expired, refresh and re-login the user
    const newToken = await openidClient.refresh(tokenSet.refresh_token);
    const user = User.fromTokenSet(newToken);
    await asyncLogin(req, user);
    return user;
  } catch (error) {
    handleAuthError(error);
  }
  throw new Error('could not authenticate session user');
}

/*
 * Retrieves a user's authentication info from a bearer token. Validates the
 * token before resolving
 * */
export async function authenticateApiTokenUser(
  req: Request,
  client: OpenidClient,
): Promise<UserDto> {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }
  if (authHeader.indexOf('Bearer ') === -1) {
    throw new Error('Malformed Authorization header');
  }
  if (!(KEYCLOAK_HOST && KEYCLOAK_REALM)) {
    throw new Error('Invalid keycloak configuration');
  }

  const match = authHeader.match('Bearer (.*)$');
  const accessToken = match ? match[1] : '';
  if (!accessToken || accessToken.trim() === '') {
    throw new Error('Invalid access token');
  }
  const keystore = await client.issuer.keystore(true);
  // verify token signature, throws an error if verification fails
  const {payload} = await JWS.createVerify(keystore).verify(accessToken);

  //verification succeeded, we can trust the contents of this access token
  const {
    sub,
    preferred_username,
    email,
    realm_access,
  }: AccessToken = JSON.parse(payload.toString('UTF8'));

  return {
    id: sub,
    name: preferred_username,
    email: email,
    roles: realm_access?.roles,
  };
}

// just wraps passport's callback based api with a promise
function asyncLogin(req: Request, user: UserDto): Promise<void> {
  return new Promise((resolve, reject) => {
    req.logIn(user, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function handleAuthError(error) {
  logger.debug(error);
  if (isExpectedError(error)) {
    // rethrow if we already know what's wrong and need to propagate up
    throw error;
  }
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
