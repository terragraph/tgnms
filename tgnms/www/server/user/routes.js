/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import bcrypt from 'bcryptjs';
import express from 'express';
import _ from 'lodash';
import passport from 'passport';
import {LOGIN_ENABLED, SALT_GEN_ROUNDS} from '../config';
import {USER, SUPERUSER} from './accessRoles';
import access from '../middleware/access';
import {User} from '../models';

const router = express.Router();

// Login / Logout Routes
router.get('/login', (req, res) => {
  if (LOGIN_ENABLED && req.isAuthenticated()) {
    res.redirect('/');
    return;
  }

  res.render('login');
});

router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/user/login',
  }),
);

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

    const user = await User.findById(id);
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
