/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import '@fbcnms/babel-register/polyfill';

import LoginForm from './views/login/LoginForm';
import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.hydrate(<LoginForm />, document.getElementById('login-root'), () => {
  ssrCleanup();
});

function ssrCleanup() {
  // We don't need the static css any more once js takes over
  const ssStyles = document.getElementById('server-side-styles');
  if (ssStyles) {
    ssStyles.parentNode.removeChild(ssStyles);
  }
}
