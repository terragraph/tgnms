/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'babel-polyfill';
import './common/axiosConfig';

import {BrowserRouter} from 'react-router-dom';
import NetworkListBase from './NetworkListBase';
import ReactDOM from 'react-dom';
import React from 'react';
import MaterialTheme from './MaterialTheme';

ReactDOM.render(
  <BrowserRouter>
    <MaterialTheme>
      <NetworkListBase />
    </MaterialTheme>
  </BrowserRouter>,
  document.getElementById('root'),
);
