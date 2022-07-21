/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import openRoutes from '../openRoutes';
import {CLIENT_ROOT_URL, LOGIN_ENABLED} from '../config';
import {URL} from 'url';
import {authenticateRequest} from '../user/authenticateRequest';
import {isAuthorized} from '../../shared/auth/Permissions';
import {isExpectedError} from '../user/errors';

import type {ExpressResponse, NextFunction} from 'express';
import type {Permission} from '../../shared/auth/Permissions';
import type {Request} from '../types/express';
import type {User as UserType} from '../../shared/auth/User';

const logger = require('../log')(module);

export default function (permissions: void | Permission | Array<Permission>) {
  return async function access(
    req: Request,
    res: ExpressResponse,
    next: NextFunction,
  ) {
    if (!LOGIN_ENABLED || isOpenRoute(req)) {
      return next();
    }

    try {
      let user: ?UserType = null;
      user = await authenticateRequest(req);

      if (user) {
        // the user only needs to be logged in to access this route
        if (typeof permissions === 'undefined') {
          return next();
        }
        // the user needs specific roles to access this route
        if (isAuthorized(user, permissions)) {
          return next();
        }
      }
      logger.info('user not authorized. redirecting');
      return authRedirect(req, res, '/user/login');
    } catch (error) {
      // expected errors - show a message to the user
      if (!error || isExpectedError(error)) {
        logger.info('invalid access token. redirecting');
        return authRedirect(
          req,
          res,
          '/user/login',
          error ? error.message : 'Auth error',
        );
      }

      // system errors
      logger.error(error);

      next(error);
    }
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
    `Client has no permission to view route: [${req.originalUrl}], redirecting to [${redirectPath}]`,
  );

  const baseUrl = CLIENT_ROOT_URL || '';
  try {
    /*
     * This will throw if CLIENT_ROOT_URL is bad, but after the catch
     * the redirect will still behave as expected.
     */
    const redirectUrl = new URL(redirectPath, baseUrl);
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
      `Could not construct redirect url, falling back [${baseUrl}] [${redirectPath}]`,
    );
  }

  res.redirect(redirectPath);
}
