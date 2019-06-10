/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import '@fbcnms/babel-register/polyfill';
import './common/axiosConfig';
import './common/i18n';

import {BrowserRouter} from 'react-router-dom';
import NetworkListBase from './NetworkListBase';
import ReactDOM from 'react-dom';
import React, {Suspense} from 'react';
import MaterialTheme from './MaterialTheme';
import LoadingBox from './components/common/LoadingBox';

ReactDOM.render(
  <BrowserRouter>
    <MaterialTheme>
      <Suspense fallback={<LoadingBox fullScreen={false} />}>
        <NetworkListBase />
      </Suspense>
    </MaterialTheme>
  </BrowserRouter>,
  document.getElementById('root'),
);
