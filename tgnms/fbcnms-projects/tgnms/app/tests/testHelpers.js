/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import MaterialTheme from '../MaterialTheme';
import NetworkContext from '../NetworkContext';
import i18next from 'i18next';
import {Router} from 'react-router-dom';
import {createMemoryHistory} from 'history';
import {initReactI18next} from 'react-i18next';
import {mockNetworkContext} from './data/NetworkContext';
import {render} from '@testing-library/react';
import type {NetworkContextType} from '../NetworkContext';
import type {User} from '../../shared/auth/User';

// exports things like mockNetworkConfig and mockTopology
export * from './data/NetworkConfig';

/**
 * wraps a component with a router instance, pass {route:'/myroute'} to set the
 * current url
 */
export function renderWithRouter(
  ui: React.Node,
  {
    route = '/',
    history = createMemoryHistory({initialEntries: [route]}),
    ...renderArgs //arguments specific to @testing-library/react.render
  }: {route?: string, history?: any} = {},
) {
  return {
    ...render(<Router history={history}>{ui}</Router>, renderArgs),
    history,
  };
}

// TGNMS renders json into the dom and loads it into window.CONFIG
export function initWindowConfig(config: any = {env: {}}) {
  if (!window) {
    throw new Error(
      'window is undefined. Ensure that the current jest environment is jsdom',
    );
  }
  window.CONFIG = config;
}

export function setTestUser(user: $Shape<User>) {
  window.CONFIG.user = user;
}

export function TestApp({children}: {children: React.Element<any>}) {
  i18next.use(initReactI18next).init({});
  return <MaterialTheme>{children}</MaterialTheme>;
}

export function NetworkContextWrapper({
  children,
  contextValue,
}: {
  children: React.Node,
  contextValue?: $Shape<NetworkContextType>,
}) {
  return (
    <NetworkContext.Provider value={mockNetworkContext(contextValue)}>
      {children}
    </NetworkContext.Provider>
  );
}
