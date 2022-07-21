/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import './common/axiosConfig';
import '@fbcnms/babel-register/polyfill';

import LoadingBox from './components/common/LoadingBox';
import MaterialTheme from './MaterialTheme';
import MomentUtils from '@date-io/moment';
import NetworkListBase from './NetworkListBase';
import React, {Suspense} from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {MuiPickersUtilsProvider} from '@material-ui/pickers';
import {WebSocketProvider} from '@fbcnms/tg-nms/app/contexts/WebSocketContext';
import {hot} from 'react-hot-loader';

/* eslint-disable-next-line no-undef */
const HotNetworkListBase = hot(module)(NetworkListBase);
const root = document.getElementById('root');

const body = document.body;
if (body) {
  body.style.overflow = 'hidden';
}

if (root) {
  ReactDOM.render(
    <BrowserRouter>
      <WebSocketProvider>
        <MaterialTheme>
          <MuiPickersUtilsProvider utils={MomentUtils}>
            <Suspense fallback={<LoadingBox fullScreen={false} />}>
              <HotNetworkListBase />
            </Suspense>
          </MuiPickersUtilsProvider>
        </MaterialTheme>
      </WebSocketProvider>
    </BrowserRouter>,
    root,
  );
}
