/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as ssr from '../ssr';
import ReactLoginForm from '../../app/views/login/LoginForm';
import _ from 'lodash';
import express from 'express';
import passport from 'passport';
import {URL} from 'url';
import {awaitClient} from './oidc';
const logger = require('../log')(module);
import staticDist from 'fbcnms-webpack-config/staticDist';
import type {Request} from '../types/express';

const router = express.Router();

router.get('/login', (req: Request, res) => {
  const errorMessage = req.query.errorMessage;
  const {app, styleSheets} = ssr.render(ReactLoginForm, {
    errorMessage: errorMessage,
  });
  return res.render('login', {
    staticDist,
    ssrRoot: app,
    ssrStyles: styleSheets,
  });
});

// oauth2 password flow
router.post('/login', (req: Request, res, next) => {
  passport.authenticate('openid_passwordflow', (err, user, info) => {
    //server error
    if (err) {
      return next(err);
    }

    // auth failure
    if (!user) {
      const errorMessage = info.message || 'Sign-in error';
      return res.redirect(`/user/login?errorMessage=${errorMessage}`);
    }

    // success
    return req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      /**
       * force session save - express-session's change detection
       * is prone to race conditions
       */
      req.session?.save(() => {
        if (
          req.body &&
          req.body.returnUrl &&
          typeof req.body.returnUrl === 'string'
        ) {
          try {
            const returnUrl = new URL(
              req.body.returnUrl,
              process.env.CLIENT_ROOT_URL,
            );
            return res.redirect(returnUrl.toString());
          } catch (err) {
            logger.error(err);
          }
        }
        return res.redirect('/');
      });
    });
  })(req, res, next);
});

// oauth2 authorization code flow
router.get('/login/openid', passport.authenticate('openid_authcodeflow'));
router.get(
  '/login/openid/callback',
  passport.authenticate('openid_authcodeflow', {
    successRedirect: '/',
    failureRedirect: '/user/login',
  }),
);

router.get('/userinfo', (req: Request, res) => {
  return awaitClient()
    .then(client => {
      if (!client) {
        return res.status(500).send({message: 'OIDC Client not initialized'});
      }
      if (req.user && typeof req.user.getAccessToken === 'function') {
        // If login is disabled, there will be no user
        const accessToken = req.user.getAccessToken();
        if (!accessToken) {
          return res.status(400);
        }
        return client.userinfo(accessToken);
      }
    })
    .then(userInfo => {
      res.send(userInfo);
    })
    .catch(() => {
      res.status(500).send({message: 'Userinfo endpoint error'});
    });
});

router.post('/logout', (req: Request, res) => {
  if (req.isAuthenticated()) {
    req.logout();
  }
  res.redirect('/user/login');
});

module.exports = router;
