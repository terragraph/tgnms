/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {LOGIN_ENABLED} from '../config';
import {USER, SUPERUSER} from '../user/accessRoles';

// Validator functions to check the permissions of a given request
const validators = {
  [USER]: req => {
    return req.isAuthenticated();
  },
  [SUPERUSER]: req => {
    return req.user && req.user.role === SUPERUSER;
  },
};

// Redirects if the request doesn't meet the specified level
const redirects = {
  [USER]: '/user/login',
  [SUPERUSER]: '/',
};

export default function access(level) {
  return (req, res, next) => {
    const hasPermission = validators[level](req);

    if (!LOGIN_ENABLED || hasPermission) {
      // Continue to the next middleware if the user has permission
      next();
      return;
    }

    // Otherwise redirect the user to the specified redirect based on the
    // access level
    res.redirect(redirects[level]);
  };
}
