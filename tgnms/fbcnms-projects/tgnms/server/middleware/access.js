/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import {URL} from 'url';
import {LOGIN_ENABLED, CLIENT_ROOT_URL} from '../config';
import openRoutes from '../openRoutes';
import {USER, SUPERUSER} from '../user/accessRoles';
import {ensureAccessToken, isExpectedError} from '../user/oidc';

const logger = require('../log')(module);

// Validator functions to check the permissions of a given request
const validators = {
  [USER]: req => {
    return req.isAuthenticated();
  },
  [SUPERUSER]: req => {
    return (
      req.isAuthenticated() &&
      req.user &&
      req.user.roles &&
      req.user.roles.includes('superuser')
    );
  },
};

// Redirects if the request doesn't meet the specified level
const redirects = {
  [USER]: '/user/login',
  [SUPERUSER]: '/',
};

export default function(level: USER | SUPERUSER) {
  if (!validators[level]) {
    throw new Error(`Access: invalid level: ${level}`);
  }
  return function access(req: any, res: any, next: any) {
    if (!LOGIN_ENABLED || isOpenRoute(req)) {
      return next();
    }

    return ensureAccessToken(req)
      .then(() => {
        const hasPermission = validators[level](req);
        if (hasPermission) {
          return next();
        }
        logger.info('user not authorized. redirecting');
        return authRedirect(req, res, redirects[level]);
      })
      .catch(error => {
        // expected errors - show a message to the user
        if (!error || isExpectedError(error)) {
          logger.info('invalid access token. redirecting');
          return authRedirect(
            req,
            res,
            redirects[level],
            error ? error.message : 'Auth error',
          );
        }

        // system errors
        logger.error(error);

        next(error);
      });
  };
}

function isOpenRoute(req) {
  for (const route of openRoutes) {
    if (req.originalUrl.startsWith(route)) {
      return true;
    }
  }
  return false;
}

function authRedirect(
  req: any,
  res: any,
  redirectPath: string,
  errorMessage?: string = '',
) {
  logger.debug(
    'Client has no permission to view route: [%s], redirecting to [%s]',
    req.originalUrl,
    redirectPath,
  );

  try {
    const redirectUrl = new URL(redirectPath, CLIENT_ROOT_URL);
    redirectUrl.searchParams.set('returnUrl', req.originalUrl);
    if (errorMessage) {
      redirectUrl.searchParams.set('errorMessage', errorMessage);
    }
    if (req.xhr) {
      return res.status(401).send({error: errorMessage, redirectUrl});
    }
    return res.redirect(redirectUrl);
  } catch (err) {
    logger.error(
      'Could not construct redirect url, falling back [%s] [%s]',
      req.hostname,
      redirectPath,
    );
  }

  res.redirect(redirectPath);
}
