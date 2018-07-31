/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import bcrypt from 'bcryptjs';
import passport from 'passport';
import {Strategy as LocalStrategy} from 'passport-local';
import {User} from '../models';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({where: {email}});

        // Check if user exists
        if (!user) {
          return done(null, false, {message: 'Username or password invalid!'});
        }

        // Compare passwords
        if (await bcrypt.compare(password, user.password)) {
          // Passwords match, return the user
          done(null, user);
        } else {
          // Passwords don't match
          done(null, false, {message: 'Username or password invalid!'});
        }
      } catch (error) {
        done(error);
      }
    },
  ),
);
