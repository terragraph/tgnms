/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {
  OpenIdConnectError,
  OpenidVerifyCallback,
  PasswordGrantStrategyOptions,
  TokenSet,
} from './oidcTypes';

import {
  ERROR_MESSAGES,
  getOidcErrorMessage,
  isSocketTimeoutError,
} from './errors';
import {Strategy} from 'passport-strategy';

const logger = require('../log')(module);

/**
 * the default openid strategy uses the authorization code grant type
 * we must use the password grant type if we want a custom login page
 */
export default class PasswordGrantStrategy extends Strategy {
  constructor(
    options: PasswordGrantStrategyOptions,
    verify: OpenidVerifyCallback,
  ) {
    super();
    if (
      typeof options !== 'object' ||
      typeof options.client === 'undefined' ||
      typeof verify !== 'function'
    ) {
      throw new Error('invalid PasswordGrantStrategy parameters');
    }
    this._options = options;
    this._client = options.client;
    this._verify = verify;
  }

  authenticate(req: any) {
    const {username, password} = req.body;
    if (!username || !password) {
      return this.fail({message: ERROR_MESSAGES.credentials});
    }
    return (
      this._client
        .grant({
          grant_type: 'password',
          username,
          password,
          scope: 'openid profile',
        })
        /**
         * At this point, we can't trust the identity token
         * we must decrypt and verify the signature
         */
        .then((tokenSet: TokenSet) => {
          logger.debug('received token set. decrypting id_token');
          return this._client.decryptIdToken(tokenSet);
        })
        .then((tokenSet: TokenSet) => {
          logger.debug('validating id_token');
          /**
           * We're not currently checking state or nonce here, only signature
           * because we're not being redirected or accepting a callback
           */
          return this._client.validateIdToken(
            tokenSet, //token
            null, // nonce
            'token', // returned by
            null, // max age
            null, //state
          );
        })
        /**
         * we have now verified the id token signature
         * so we can safely trust its contents
         */
        .then((tokenSet: TokenSet) => {
          logger.debug('id_token validated');
          return this._verify(
            req,
            tokenSet,
            tokenSet.claims,
            this.verified.bind(this),
          );
        })
        .catch((error: Error | OpenIdConnectError) => {
          if (error.name === 'OpenIdConnectError') {
            const errorMessage = getOidcErrorMessage(error);
            return this.fail({message: errorMessage});
          }
          if (isSocketTimeoutError(error)) {
            return this.fail({message: ERROR_MESSAGES.remoteDown});
          }
          logger.error(error.toString());
          return this.error(error);
        })
    );
  }
  /**
   * This gets invoked by the user-provided verify function
   * example:
   *                                                                  v- this
   * passport.use('mystrategy', new MyStrategy(options, (some, param, done) => {
   *  done(null, {user to serialize into session});
   * }))
   **/
  verified(err: Error, user: any, info: any) {
    if (err) {
      this.error(err);
    } else if (!user) {
      this.fail(info);
    } else {
      this.success(user, info);
    }
  }
}
