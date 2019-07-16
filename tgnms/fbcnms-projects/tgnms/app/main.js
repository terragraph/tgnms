/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import './common/axiosConfig';
import './common/i18n';
import '@fbcnms/babel-register/polyfill';

import LoadingBox from './components/common/LoadingBox';
import MaterialTheme from './MaterialTheme';
import NetworkListBase from './NetworkListBase';
import React, {Suspense} from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {hot} from 'react-hot-loader';

/* eslint-disable-next-line no-undef */
const HotNetworkListBase = hot(module)(NetworkListBase);

ReactDOM.render(
  <BrowserRouter>
    <MaterialTheme>
      <Suspense fallback={<LoadingBox fullScreen={false} />}>
        <HotNetworkListBase />
      </Suspense>
    </MaterialTheme>
  </BrowserRouter>,
  document.getElementById('root'),
);
