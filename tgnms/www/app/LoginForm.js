/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';

export default class LoginForm extends React.Component {
  render() {
    return (
      <div className="login-form">
        <div className="login-form-title">Terragraph NMS</div>
        <div className="login-form-inner">
          <form action="/user/login" method="post">
            <input placeholder="email" name="email" />
            <input placeholder="password" type="password" name="password" />
            <input type="submit" value="Login" />
          </form>
        </div>
      </div>
    );
  }
}
