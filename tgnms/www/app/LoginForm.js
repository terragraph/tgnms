/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from 'react';

export default class LoginForm extends React.Component {
  render() {
    return (
      <div className="login-form">
        <div className="login-form-title">FBC NMS</div>
        <div className="login-form-inner">
          <form method="post">
            <input placeholder="email" />
            <input placeholder="password" type="password" />
            <button>Login</button>
          </form>
        </div>
      </div>
    );
  }
}
