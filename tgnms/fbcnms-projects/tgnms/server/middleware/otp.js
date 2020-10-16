/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * Controller downloads custom TG images from NMS. Since all static files are
 * protected by keycloak authentication, controller can't download custom
 * TG images. This middleware protects an open route using a one-time-password
 * token.
 *
 * The flow is:
 * - generate a token via generateAndStoreOtp
 * - attach the token to the url sent to controller in the querystring like:
 *      http://tgnms.com/static/tg-binaries/mybinary.bin?token=12345
 * - protect /static/tg-binaries with the otpMiddleware function
 */

// eslint-disable-next-line no-unused-vars
import type express from 'express';
const crypto = require('crypto');

export type OtpMiddlewareParams = {|
  queryKey: string,
|};

const defaultParams = {
  queryKey: 'token',
};

/**
 * Storage of one-time tokens. After a token is used,
 * it is removed from the token store and cannot be used again.
 */
const otpTokenStore = new Set<string>();

export function otpMiddleware(params?: OtpMiddlewareParams = defaultParams) {
  return (
    req: express$Request,
    res: express$Response,
    next: express$NextFunction,
  ) => {
    const token = req.query[params.queryKey];
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(401).send({
        error: 'missing url token',
      });
    }
    if (!otpTokenStore.has(token)) {
      return res.status(403).send({error: 'invalid token'});
    }
    otpTokenStore.delete(token);
    return next();
  };
}

/**
 * Generates a secure token and stores it in the one time cache
 */
export async function generateAndStoreOtp(): Promise<string> {
  const token = await new Promise((res, rej) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        return rej(err);
      }
      const token = buffer.toString('hex');
      res(token);
    });
  });
  otpTokenStore.add(token);
  return token;
}
