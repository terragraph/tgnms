/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import '@fbcnms/babel-register/polyfill';
import './common/axiosConfig';
import './common/i18n';

import {hot} from 'react-hot-loader';
import {BrowserRouter} from 'react-router-dom';
import NetworkListBase from './NetworkListBase';
import ReactDOM from 'react-dom';
import React, {Suspense} from 'react';
import MaterialTheme from './MaterialTheme';
import LoadingBox from './components/common/LoadingBox';

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
