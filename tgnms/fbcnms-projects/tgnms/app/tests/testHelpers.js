/**
 * ALL of the required permissions
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {Router} from 'react-router-dom';
import {render} from 'react-testing-library';
import {createMemoryHistory} from 'history';
import type {User} from '../../shared/auth/User';

/**
 * wraps a component with a router instance, pass {route:'/myroute'} to set the
 * current url
 */
export function renderWithRouter(
  ui: React.Node,
  {
    route = '/',
    history = createMemoryHistory({initialEntries: [route]}),
  }: {route?: string, history?: any} = {},
) {
  return {
    ...render(<Router history={history}>{ui}</Router>),
    history,
  };
}

// TGNMS renders json into the dom and loads it into window.CONFIG
export function initWindowConfig(config: any) {
  if (!window) {
    throw new Error(
      'window is undefined. Ensure that the current jest environment is jsdom',
    );
  }
  window.CONFIG = config;
}

export function setTestUser(user: User) {
  window.CONFIG.user = user;
}
