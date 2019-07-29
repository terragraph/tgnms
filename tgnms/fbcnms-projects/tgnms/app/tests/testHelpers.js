/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import MaterialTheme from '../MaterialTheme';
import i18next from 'i18next';
import {Router} from 'react-router-dom';
import {createMemoryHistory} from 'history';
import {initReactI18next} from 'react-i18next';
import {render} from '@testing-library/react';
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

export function TestApp({children}: {children: React.Element<any>}) {
  i18next.use(initReactI18next).init({});
  return <MaterialTheme>{children}</MaterialTheme>;
}
