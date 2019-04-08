/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const {URL} = require('url');
import passport from 'passport';
const logger = require('../log')(module);
import {LOGIN_ENABLED, CLIENT_ROOT_URL} from '../config';
import {Strategy as OpenidStrategy} from 'openid-client';
import {initOidcClient, PasswordGrantStrategy, StubStrategy} from './oidc';
import ApplicationUser from './User';

passport.serializeUser((user: ApplicationUser, done) => {
  /**
   * the token set contains the encoded claims,
   * so we serialize that instead of the user.
   */
  done(null, user.__getTokenSet());
});

passport.deserializeUser((req, serializedTokenSet, done) => {
  try {
    const user = ApplicationUser.fromTokenSet(serializedTokenSet);
    done(null, user);
  } catch (error) {
    done(null, false);
  }
});

if (LOGIN_ENABLED) {
  passport.use('openid_passwordflow', new StubStrategy());
  passport.use('openid_authcodeflow', new StubStrategy());
  if (!CLIENT_ROOT_URL) {
    throw new Error(
      `Missing required environment variable: CLIENT_ROOT_URL - example: https://tgnms.com`,
    );
  }
  initOidcClient().then(client => {
    logger.info('configuring openid auth strategies');

    const redirectUri = new URL(CLIENT_ROOT_URL);
    redirectUri.pathname = '/user/login/openid/callback';

    passport.use(
      'openid_passwordflow',
      new PasswordGrantStrategy(
        {
          client,
        },
        handleOidcResponse,
      ),
    );

    passport.use(
      'openid_authcodeflow',
      new OpenidStrategy(
        {
          client,
          passReqToCallback: true,
          params: {
            redirect_uri: redirectUri.toString(),
          },
        },
        handleOidcResponse,
      ),
    );
  });
}

function handleOidcResponse(_req, tokenSet, _claims, done) {
  return done(undefined, ApplicationUser.fromTokenSet(tokenSet));
}
