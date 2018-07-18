/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import bcrypt from 'bcryptjs';
import express from 'express';
import passport from 'passport';
import {User} from '../models';
import {SALT_GEN_ROUNDS} from '../config';

const app = express();

app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
  }),
);

app.get('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    req.logout();
  }
  res.redirect('/login');
});

app.post('/', async (req, res) => {
  try {
    const {email, password} = req.body;
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
    });

    res.status(201).send({user});
  } catch (error) {
    res.status(400).send({error: error.toString()});
  }
});

module.exports = app;
