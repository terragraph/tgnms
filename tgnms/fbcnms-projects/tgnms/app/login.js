/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
const x = 5;
// very very long line very very long line very very long line very very long line very very long line very very long line
function ssrCleanup() {
  // We don't need the static css any more once js takes over
  const ssStyles = document.getElementById('server-side-styles');
  if (ssStyles && ssStyles.parentNode) {
    ssStyles.parentNode.removeChild(ssStyles);
  }
}
