/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {Client} from 'openid-client';

export type PasswordGrantStrategyOptions = {
  client: $Shape<Client>,
};

export type OpenIdConnectError = {
  error: string,
  error_description: string,
  error_uri: string,
  state: string,
  scope: string,
  name: 'OpenIdConnectError',
};

// the parsed and validated access token
export type AccessToken = {
  jti: string,
  exp: number,
  nbf: number,
  iat: number,
  iss: string,
  aud: string,
  sub: string,
  typ: string,
  azp: string,
  auth_time: number,
  session_state: string,
  acr: string,
  realm_access: {
    roles: Array<string>,
  },
  scope: string,
  email_verified: false,
  clientId: string,
  clientHost: string,
  preferred_username: string,
  clientAddress: string,
  email: string,
};
