/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import MaterialTheme from '../MaterialTheme';
import MockWebSocket from './mocks/MockWebSocket';
import i18next from 'i18next';
import {Router} from 'react-router-dom';
import {WebSocketProvider} from '../WebSocketContext';
import {createMemoryHistory} from 'history';
import {initReactI18next} from 'react-i18next';
import {render} from '@testing-library/react';
import type {User} from '../../shared/auth/User';
import type {WebSocketProviderProps} from '../WebSocketContext';

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

export function TestApp({
  children,
  webSocketProviderProps,
}: {
  children: React.Element<any>,
  webSocketProviderProps: WebSocketProviderProps,
}) {
  i18next.use(initReactI18next).init({});
  return (
    <MaterialTheme>
      <WebSocketProvider
        socketFactory={() => {
          const socket: WebSocket = (new MockWebSocket(): any);
          return socket;
        }}
        {...webSocketProviderProps || {}}>
        {children}
      </WebSocketProvider>
    </MaterialTheme>
  );
}
