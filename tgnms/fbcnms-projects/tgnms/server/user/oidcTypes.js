/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

export type PasswordGrantStrategyOptions = {
  client: OpenidClient,
};

export type OpenidVerifyCallback = {
  (
    req: any,
    tokenset: any,
    userinfo: OpenidUserInfoClaims,
    done: (error: Error | void, user: any) => any,
  ): any,
};

export type OpenIdConnectError = {
  error: string,
  error_description: string,
  error_uri: string,
  state: string,
  scope: string,
  name: 'OpenIdConnectError',
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

type GrantRequestOptions = {
  grant_type: string,
  username: string,
  password: string,
  scope: string,
};
