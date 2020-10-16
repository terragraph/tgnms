/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
import translatedFbts from '../i18n/translatedFbts.json';
import {BrowserRouter} from 'react-router-dom';
import {MuiPickersUtilsProvider} from '@material-ui/pickers';
import {WebSocketProvider} from './contexts/WebSocketContext';
import {hot} from 'react-hot-loader';
import {init} from 'fbt';

init({translations: translatedFbts});

/* eslint-disable-next-line no-undef */
const HotNetworkListBase = hot(module)(NetworkListBase);
const root = document.getElementById('root');

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
