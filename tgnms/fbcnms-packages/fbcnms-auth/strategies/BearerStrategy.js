/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {FBCNMSMiddleWareRequest} from '@fbcnms/express-middleware';

import {Strategy} from 'passport-http-bearer';
import {clientFromRequest} from '../oidc/client';

export default function BearerTokenStrategy() {
  return new Strategy({passReqToCallback: true}, verify);
}

type TokenUser = {
  email: string,
  organization: string,
};

const verify = async (
  req: FBCNMSMiddleWareRequest,
  token: string,
  done: (?Error, ?TokenUser | ?boolean) => void,
) => {
  try {
    const user = await authenticateToken(token, req);
    if (!user) {
      throw new Error('Invalid token!');
    }
    return done(null, user);
  } catch (e) {
    done(e);
  }
};

const authenticateToken = async (
  accessToken: string,
  req: FBCNMSMiddleWareRequest,
): Promise<TokenUser> => {
  const org = await req.organization();
  const client = await clientFromRequest(req);
  const user = await client.userinfo(accessToken);
  return {...user, organization: org.name};
};
