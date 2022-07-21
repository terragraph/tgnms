/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as ssr from '../ssr';
import ReactLoginForm from '../../app/views/login/LoginForm';
import _ from 'lodash';
import passport from 'passport';
import staticDist from '@fbcnms/webpack-config/staticDist';
import {Api} from '../Api';
import {LOGIN_ENABLED} from '../config';
import {URL} from 'url';
import {awaitClient} from './oidc';
import type {NextFunction} from 'express';

export default class MyRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();

    router.get('/login', (req, res) => {
      if (!LOGIN_ENABLED) {
        this.logger.warn('login disabled. redirecting to /');
        return res.redirect('/');
      }
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
    router.post('/login', (req, res, next: NextFunction) => {
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
                this.logger.error(err);
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

    router.get('/userinfo', (req, res) => {
      return awaitClient()
        .then(client => {
          if (!client) {
            return res
              .status(500)
              .send({message: 'OIDC Client not initialized'});
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

    router.post('/logout', (req, res) => {
      if (req.isAuthenticated()) {
        req.logout();
      }
      res.redirect('/user/login');
    });
    return router;
  }
}
