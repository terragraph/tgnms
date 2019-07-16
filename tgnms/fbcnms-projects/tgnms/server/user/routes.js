/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import * as ssr from '../ssr';
import ReactLoginForm from '../../app/views/login/LoginForm';
import _ from 'lodash';
import access from '../middleware/access';
import bcrypt from 'bcryptjs';
import express from 'express';
import passport from 'passport';
import {SALT_GEN_ROUNDS} from '../config';
import {SUPERUSER, USER} from './accessRoles';
import {URL} from 'url';
import {User} from '../models';
import {awaitClient} from './oidc';
const logger = require('../log')(module);
import staticDist from 'fbcnms-webpack-config/staticDist';

const router = express.Router();

router.get('/login', (req, res) => {
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
router.post('/login', (req, res, next) => {
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
    return req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }
      if (req.body.returnUrl) {
        try {
          const returnUrl = new URL(
            req.body.returnUrl,
            process.env.CLIENT_ROOT_URL,
          );
          return res.redirect(returnUrl);
        } catch (err) {
          logger.error(err);
        }
      }
      return res.redirect('/');
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
        return res.status(500).send({message: 'OIDC Client not initialized'});
      }
      // If login is disabled, there will be no user
      const accessToken =
        req.user &&
        typeof req.user.getAccessToken === 'function' &&
        req.user.getAccessToken();
      return client.userinfo(accessToken);
    })
    .then(userInfo => {
      res.send(userInfo);
    })
    .catch(() => {
      res.status(500).send({message: 'Userinfo endpoint error'});
    });
});

router.get('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    req.logout();
  }
  res.redirect('/user/login');
});

// User Routes
router.get('/', access(SUPERUSER), async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).send({users});
  } catch (error) {
    res.status(400).send({error: error.toString()});
  }
});

// TODO: Determine what access level this should have
router.post('/', async (req, res) => {
  try {
    const {email, password, superUser} = req.body;
    if (!email) {
      throw new Error('Email not included!');
    }

    // Check if user exists
    if (await User.findOne({where: {email}})) {
      throw new Error(`${email} already exists`);
    }

    // Create new user
    const salt = await bcrypt.genSalt(SALT_GEN_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password: passwordHash,
      role: superUser ? SUPERUSER : USER,
    });

    res.status(201).send({user});
  } catch (error) {
    res.status(400).send({error: error.toString()});
  }
});

router.put('/:id', access(SUPERUSER), async (req, res) => {
  try {
    const {id} = req.params;
    const {body} = req;

    const user = await User.findByPk(id);
    // Check if user exists
    if (!user) {
      throw new Error('User does not exist!');
    }

    // Create object to pass into update()
    const allowedProps = ['password', 'superUser'];
    const userPropsToUpdate = {};

    for (const prop of allowedProps) {
      if (body.hasOwnProperty(prop)) {
        switch (prop) {
          case 'password':
            // Hash the password if we are changing the password
            const salt = await bcrypt.genSalt(SALT_GEN_ROUNDS);
            const passwordHash = await bcrypt.hash(body[prop], salt);
            userPropsToUpdate[prop] = passwordHash;
            break;

          case 'superUser':
            userPropsToUpdate.role = body.superUser ? SUPERUSER : USER;
            break;

          default:
            userPropsToUpdate[prop] = body[prop];
            break;
        }
      }
    }

    if (_.isEmpty(userPropsToUpdate)) {
      throw new Error('No valid properties to edit!');
    }

    // Update user's password
    await user.update(userPropsToUpdate);
    res.status(200).send({user});
  } catch (error) {
    res.status(400).send({error: error.toString()});
  }
});

router.delete('/:id', access(SUPERUSER), async (req, res) => {
  const {id} = req.params;

  try {
    await User.destroy({where: {id}});
    res.status(200).send();
  } catch (error) {
    res.status(400).send({error: error.toString()});
  }
});

module.exports = router;
