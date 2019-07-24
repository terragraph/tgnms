/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import 'jest-dom/extend-expect';
import MockWebSocket from '../../../../tests/mocks/MockWebSocket';
import NotificationMenu from '../NotificationMenu';
import React from 'react';
import {TestApp} from '../../../../tests/testHelpers';
import {WebSocketMessage} from '../../../../../shared/dto/WebSockets';
import {
  act,
  cleanup,
  fireEvent,
  getByText,
  render,
} from '@testing-library/react';

afterEach(cleanup);

test('by default, only renders the toggle button', () => {
  const {getByTestId, queryByTestId} = render(<NotificationMenu />, {
    wrapper: TestApp,
  });
  expect(getByTestId('menu-toggle')).toBeInTheDocument();
  expect(queryByTestId('notification-menu')).not.toBeInTheDocument();
});

test('clicking the toggle button opens the menu', () => {
  const {getByTestId, queryByTestId} = render(<NotificationMenu />, {
    wrapper: TestApp,
  });
  clickButton(getByTestId('menu-toggle'));
  expect(queryByTestId('notification-menu')).toBeInTheDocument();
});

test('toggle button badge is invisible by default', () => {
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: TestApp,
  });
  const badge = getByTestId('badge');
  expect(badge).toBeInTheDocument();
  expect(badge.getAttribute('data-invisible')).toBeTrue;
});

test('toggle button badge shows when a notification arrives while closed', () => {
  let socket: MockWebSocket;
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestApp
        {...props}
        webSocketProviderProps={{
          socketFactory: () => (socket = new MockWebSocket()),
        }}
      />
    ),
  });

  act(() => {
    triggerGenericMessage(socket);
  });

  const badge = getByTestId('badge');
  expect(badge.getAttribute('data-invisible')).toBeFalse;
});

test('toggling menu while badge is showing will hide badge', () => {
  let socket: MockWebSocket;
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestApp
        {...props}
        webSocketProviderProps={{
          socketFactory: () => (socket = new MockWebSocket()),
        }}
      />
    ),
  });

  act(() => {
    triggerGenericMessage(socket);
  });

  const badge = getByTestId('badge');
  expect(badge.getAttribute('data-invisible')).toBeFalse;
  clickButton(getByTestId('menu-toggle'));
  expect(badge.getAttribute('data-invisible')).toBeTrue;
});

test('the menu shows a "no notifications" message by default', () => {
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: TestApp,
  });
  clickButton(getByTestId('menu-toggle'));
  expect(getByTestId('no-events-message')).toBeInTheDocument();
});

test('renders new notifications whenever the websocket group receives a message', () => {
  let socket: MockWebSocket;
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestApp
        {...props}
        webSocketProviderProps={{
          socketFactory: () => (socket = new MockWebSocket()),
        }}
      />
    ),
  });
  clickButton(getByTestId('menu-toggle'));
  const menu = getByTestId('notification-menu');
  act(() => {
    triggerGenericMessage(socket);
  });
  expect(getByText(menu, 'test-reason-message')).toBeInTheDocument();
});

test('clicking on a notification opens the details dialog', () => {
  let socket: MockWebSocket;
  const {getByTestId, getByTitle} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestApp
        {...props}
        webSocketProviderProps={{
          socketFactory: () => (socket = new MockWebSocket()),
        }}
      />
    ),
  });
  clickButton(getByTestId('menu-toggle'));
  act(() => {
    triggerGenericMessage(socket);
  });
  clickButton(getByTitle('Show Details'));
  expect(getByTestId('notification-dialog')).toBeInTheDocument();
});

function clickButton(button) {
  act(() => {
    fireEvent(
      button,
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

// simulates the websocket receiving a kafka message from the server
function triggerGenericMessage(
  socket: MockWebSocket,
  message: string = 'test-reason-message',
) {
  socket.triggerMessage(
    new WebSocketMessage({
      key: null,
      group: 'events',
      payload: {
        offset: 1,
        value: JSON.stringify({reason: message}),
      },
    }),
  );
}
