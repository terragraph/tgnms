/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
const logger = require('../log')(module);
import {invert} from 'lodash';
import type {ExpressRequest, ExpressResponse, NextFunction} from 'express';

export const STARTUP_STEPS = {
  PENDING: 0,
  // Startup middleware is ready to serve requests temporarily
  START: 1,
  DATABASE_CONFIGURE: 2,
  DATABASE_READY: 3,
  DONE: 4,
};

const STARTUP_STEP_TO_NAME = invert(STARTUP_STEPS);

export type StartupState = {|
  step: number,
  errorMessage: ?string,
  setStep: (step: number) => void,
|};

export function makeStartupState(): StartupState {
  const state = {
    step: STARTUP_STEPS.PENDING,
    errorMessage: null,
    setStep: step => {
      state.step = step;
      logger.debug(`Startup step: ${STARTUP_STEP_TO_NAME[step]}`);
    },
  };
  return state;
}

export function startupMiddleware(state: StartupState) {
  /**
   * transition to the start step now that
   * startupMiddleware is ready to serve requests
   */
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const {step, errorMessage} = state;
    if (step === STARTUP_STEPS.DONE) {
      return next();
    }

    return res.status(200).send(
      `<html>
          <head>
            <meta http-equiv="refresh" content="1">
          </head>
          <style>
            body {
              font-family: sans-serif;
            }
          </style>
          <body data-testid="startup-message">
            <p>NMS is starting up. Current step: ${
              STARTUP_STEP_TO_NAME[step]
            }</p>
            ${
              errorMessage != null
                ? `<div style="color:red;">Error: <p>${errorMessage}</p></div>`
                : ''
            }
          </body>
       </html>`,
    );
  };
}
