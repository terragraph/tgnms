/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
const {URL} = require('url');
import passport from 'passport';
const logger = require('../log')(module);
import ApplicationUser from './User';
import PasswordGrantStrategy from './PasswordGrantStrategy';
import StubStrategy from '@fbcnms/auth/strategies/StubStrategy';
import {CLIENT_ROOT_URL, LOGIN_ENABLED, SSO_ENABLED} from '../config';
import {Strategy} from 'openid-client';
import {initOidcClient} from './oidc';

passport.serializeUser((user: ApplicationUser, done) => {
  const serialized = user.__getTokenSet ? user.__getTokenSet() : user;
  /**
   * the token set contains the encoded claims,
   * so we serialize that instead of the user.
   */
  done(null, serialized);
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
  initOidcClient().then(client => {
    logger.info('configuring openid auth strategies');

    passport.use(
      'openid_passwordflow',
      new PasswordGrantStrategy(
        {
          client,
        },
        handleOidcResponse,
      ),
    );
    if (SSO_ENABLED) {
      try {
        if (!CLIENT_ROOT_URL) {
          throw new Error(
            `Missing required environment variable: CLIENT_ROOT_URL - example: https://tgnms.com`,
          );
        }
        const redirectUri = new URL(CLIENT_ROOT_URL);
        redirectUri.pathname = '/user/login/openid/callback';
        passport.use(
          'openid_authcodeflow',
          new Strategy(
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
      } catch (err) {
        logger.error(err);
      }
    }
  });
}

function handleOidcResponse(_req, tokenSet, _claims, done) {
  return done(undefined, ApplicationUser.fromTokenSet(tokenSet));
}
