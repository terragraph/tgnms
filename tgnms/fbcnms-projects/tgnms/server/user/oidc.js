/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {URL} = require('url');
const logger = require('../log')(module);
import {Strategy} from 'passport-strategy';
import {
  Issuer as OpenidIssuer,
  TokenSet as OpenidTokenSet,
} from 'openid-client';
const {
  KEYCLOAK_HTTP_PROXY,
  KEYCLOAK_HOST,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
} = require('../config');
import User from './User';

let openidClient: OpenidClient;
export function initOidcClient(): Promise<OpenidClient> {
  OpenidIssuer.defaultHttpOptions = {
    proxy: KEYCLOAK_HTTP_PROXY,
  };
  /**
   * https://www.npmjs.com/package/openid-client#proxy-settings
   * once we have a better story around lab proxying, we can replace this
   * with their default request instance
   */
  OpenidIssuer.httpClient = require('./oidcHttpAgent')();

  if (!KEYCLOAK_HOST || !KEYCLOAK_REALM) {
    throw new Error(
      'missing required environment variable KEYCLOAK_HOST, KEYCLOAK_REALM ',
    );
  }

  const issuerUrl = new URL(KEYCLOAK_HOST);
  issuerUrl.pathname = `/auth/realms/${KEYCLOAK_REALM}`;

  const tryDiscovery = () => {
    logger.info('openid discovery: starting');
    logger.debug(
      `openid discovery: connecting to issuer: ${issuerUrl.toString()}`,
    );
    return OpenidIssuer.discover(issuerUrl.toString()).then(
      (issuer: OpenidIssuer) => {
        openidClient = new issuer.Client({
          client_id: KEYCLOAK_CLIENT_ID,
          client_secret: KEYCLOAK_CLIENT_SECRET,
        });
        logger.info('openid discovery: success');
        return openidClient;
      },
    );
  };

  /**
   * Transparently retry discovery until it succeeds
   **/
  return new Promise(resolve => {
    const attempt = () => {
      tryDiscovery()
        .then(client => resolve(client))
        .catch(_error => {
          logger.info('openid discovery: failed. retrying in 5s.');
          setTimeout(attempt, 5000);
        });
    };
    attempt();
  });
}

export function getClient() {
  return openidClient;
}

/**
 * the default openid strategy uses the authorization code grant type
 * we must use the password grant type if we want a custom login page
 */
export class PasswordGrantStrategy extends Strategy {
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
          logger.error(error);
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

//use this in place of the real openid strategies until discovery finishes
export class StubStrategy extends Strategy {
  constructor() {
    super();
    this.name = 'stub';
  }
  authenticate() {
    return this.fail({message: ERROR_MESSAGES.remoteDown});
  }
}

/**
 * Checks the user's session for a valid access token. If the token is stale, it
 * will be refreshed. If it cannot be refreshed, an error will be returned to
 * the callsite's promise chain
 */
export function ensureAccessToken(req: any) {
  if (!(req.session && req.session.passport && req.session.passport.user)) {
    return Promise.reject(createExpectedError(ERROR_KEYS.noSession));
  }
  const tokenSet = new OpenidTokenSet(req.session.passport.user);
  if (!tokenSet.expired()) {
    return Promise.resolve(tokenSet);
  }
  logger.info(`refreshing expired access token`);
  if (!openidClient) {
    return Promise.reject(createExpectedError(ERROR_KEYS.remoteDown));
  }
  return openidClient
    .refresh(tokenSet.refresh_token) //refresh also validates the token
    .then(refreshed => {
      logger.info(`access token refreshed`);
      const user = User.fromTokenSet(refreshed);
      return new Promise((resolve, reject) => {
        req.logIn(user, err => {
          if (err) {
            return reject(err);
          }
          resolve(refreshed);
        });
      });
    })
    .catch((error: any) => {
      console.dir(error);
      if (error.name === 'OpenIdConnectError') {
        /**
         * If we receive an invalid grant error during refresh, the token has
         * expired. The user must login again.
         */
        if (error.error === 'invalid_grant') {
          return Promise.reject(createExpectedError(ERROR_KEYS.noSession));
        }
        logger.error(error);
        return Promise.reject(createExpectedError(ERROR_KEYS.generic));
      }
      if (isSocketTimeoutError(error)) {
        return Promise.reject(createExpectedError(ERROR_KEYS.remoteDown));
      }
      return Promise.reject(createExpectedError(ERROR_KEYS.generic));
    });
}

const ERROR_KEYS = {
  credentials: 'credentials',
  noSession: 'noSession',
  remoteDown: 'remoteDown',
  invalidConfig: 'invalidConfig',
  generic: 'generic',
};

const ERROR_MESSAGES = {
  [ERROR_KEYS.credentials]: 'Username or password invalid',
  [ERROR_KEYS.noSession]: 'Login required',
  [ERROR_KEYS.remoteDown]:
    'Could not contact authentication server. Please contact support if this issue persists.',
  [ERROR_KEYS.invalidConfig]:
    'Invalid configuration. Please contact support if this issue persists.',
  [ERROR_KEYS.generic]:
    'An unknown error has occurred. Please contact support if this issue perists.',
};

/**
 * checks if an error name is one of the expected ERROR_MESSAGES. If so, return
 * the message to the user agent. If it is not one of the expected, handled
 * errors, return a generic error to the user agent to prevent leakage.
 */
export function isExpectedError(error: Error) {
  return error.name in ERROR_KEYS;
}

function createExpectedError(name: $Keys<typeof ERROR_KEYS>) {
  const error = new Error(ERROR_MESSAGES[name]);
  error.name = name;
  return error;
}

function getOidcErrorMessage(error: any) {
  if (error.error === 'invalid_grant') {
    return ERROR_MESSAGES.credentials;
  } else if (error.error === 'unauthorized_client') {
    return ERROR_MESSAGES.invalidConfig;
  } else {
    return ERROR_MESSAGES.generic;
  }
}

function isSocketTimeoutError(error: any) {
  return error.connect === false || error.message === 'ESOCKETTIMEDOUT';
}

type PasswordGrantStrategyOptions = {
  client: OpenidClient,
};

type OpenidVerifyCallback = {
  (
    req: any,
    tokenset: any,
    userinfo: OpenidUserInfoClaims,
    done: (error: Error | void, user: any) => any,
  ): any,
};

/**
 * These are the openid connect userinfo claims which are part of the official
 * standard. These should be mapped to an application user object. Any custom
 * claims can be specified there.
 */
export type OpenidUserInfoClaims = {
  name: string,
  preferred_username: string,
  given_name: string,
  family_name: string,
  email: string,
  jti: string,
  exp: string,
  nbf: string,
  iat: string,
  iss: string,
  aud: string,
  sub: string,
  typ: string,
  azp: string,
  auth_time: string,
  session_state: string,
  acr: string,
  email_verified: string,
};

export type OpenidClient = {
  grant: (options: GrantRequestOptions) => Promise<TokenSet>,
  decryptIdToken: (tokenSet: TokenSet) => Promise<TokenSet>,
  validateIdToken: (
    tokenSet: TokenSet,
    nonce: ?string,
    returnedBy: string,
    maxAge: ?string,
    state: ?string,
  ) => Promise<TokenSet>,
  refresh: (refreshToken: string) => Promise<TokenSet>,
};

type GrantRequestOptions = {
  grant_type: string,
  username: string,
  password: string,
  scope: string,
};

type OpenIdConnectError = {
  error: string,
  error_description: string,
  error_uri: string,
  state: string,
  scope: string,
  name: 'OpenIdConnectError',
};

export type TokenSet = {
  /**
   * This is the user's api key - it should be sent to
   * the auth server whenever a protected resource is requested
   */
  access_token: string,
  expires_at: number,
  refresh_expires_in: number,
  //access token is short lived, we get a new one using the refresh token
  refresh_token: string,
  scope: string,
  /**
   * oidc jwt containing information about the user
   * not to be trusted until we validate the signature
   **/
  id_token: string,
  // the TokenSet class decodes and caches these from the id_token
  claims: OpenidUserInfoClaims,
  session_state: string,
  token_type: string,
  expired: () => boolean,
};

export function __TESTSONLY_setOidcClient(client: OpenidClient) {
  openidClient = client;
}
