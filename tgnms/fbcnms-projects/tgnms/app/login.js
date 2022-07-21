/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import '@fbcnms/babel-register/polyfill';

import LoginForm from './views/login/LoginForm';
import React from 'react';
import ReactDOM from 'react-dom';

const loginRoot = document.getElementById('login-root');
if (loginRoot) {
  ReactDOM.hydrate(<LoginForm />, loginRoot, () => {
    ssrCleanup();
  });
}

function ssrCleanup() {
  // We don't need the static css any more once js takes over
  const ssStyles = document.getElementById('server-side-styles');
  if (ssStyles && ssStyles.parentNode) {
    ssStyles.parentNode.removeChild(ssStyles);
  }
}
