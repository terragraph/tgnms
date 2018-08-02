/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {LOGIN_ENABLED} from '../config';
import openRoutes from '../openRoutes';
import {USER, SUPERUSER} from '../user/accessRoles';

const logger = require('../log')(module);

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

export default level => {
  return function access(req, res, next) {
    let isOpenRoute = false;
    for (const route of openRoutes) {
      if (req.originalUrl.startsWith(route)) {
        isOpenRoute = true;
        break;
      }
    }

    const hasPermission = validators[level](req);

    if (!LOGIN_ENABLED || isOpenRoute || hasPermission) {
      // Continue to the next middleware if the user has permission
      next();
      return;
    }

    // Otherwise redirect the user to the specified redirect based on the
    // access level
    logger.debug(
      'Client has no permission to view route: [%s], redirecting to [%s]',
      req.originalUrl,
      redirects[level],
    );
    res.redirect(redirects[level]);
  };
};
