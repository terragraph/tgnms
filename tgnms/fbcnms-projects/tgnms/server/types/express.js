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
import type {TokenSet} from 'openid-client';
import type {User} from '../../shared/auth/User';

export type PassportMiddleware = {|
  isAuthenticated: () => boolean,
  user?: ?User,
  logIn: (user: User, (err: ?Error) => void) => void,
|};

export type SessionMiddleware = {|
  session?: {
    passport?: {
      user?: TokenSet,
    },
  },
|};

export type Request = ExpressRequest & PassportMiddleware & SessionMiddleware;
