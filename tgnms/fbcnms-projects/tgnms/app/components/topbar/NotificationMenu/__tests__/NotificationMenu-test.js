/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import MockWebSocket from '../../../../tests/mocks/MockWebSocket';
import NetworkListContext, {
  defaultValue as defaultContextValue,
} from '../../../../NetworkListContext';
import NotificationMenu from '../NotificationMenu';
import React from 'react';
import {TestApp} from '../../../../tests/testHelpers';
import {WebSocketMessage} from '../../../../../shared/dto/WebSockets';
import {WebSocketProvider} from '../../../../WebSocketContext';
import {
  act,
  cleanup,
  fireEvent,
  getByText,
  render,
} from '@testing-library/react';

let offsetCounter;

beforeEach(() => {
  offsetCounter = 0;
});

afterEach(cleanup);

const defaultTestMessage = 'test-reason-message';
const defaultTestNetwork = 'test-network';

test('by default, only renders the toggle button', () => {
  const {getByTestId, queryByTestId} = render(<NotificationMenu />, {
    wrapper: TestWrapper,
  });
  expect(getByTestId('menu-toggle')).toBeInTheDocument();
  expect(queryByTestId('notification-menu')).not.toBeInTheDocument();
});

test('clicking the toggle button opens the menu', () => {
  const {getByTestId, queryByTestId} = render(<NotificationMenu />, {
    wrapper: TestWrapper,
  });
  clickButton(getByTestId('menu-toggle'));
  expect(queryByTestId('notification-menu')).toBeInTheDocument();
});

test('toggle button badge is invisible by default', () => {
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: TestWrapper,
  });
  const badge = getByTestId('badge');
  expect(badge).toBeInTheDocument();
  expect(badge.getAttribute('data-invisible')).toBeTrue;
});

test('toggle button badge shows when a notification arrives while closed', () => {
  let socket: MockWebSocket;
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestWrapper
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
      <TestWrapper
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
    wrapper: TestWrapper,
  });
  clickButton(getByTestId('menu-toggle'));
  expect(getByTestId('no-events-message')).toBeInTheDocument();
});

test('renders new notifications whenever the websocket group receives a message', () => {
  let socket: MockWebSocket;
  const {getByTestId} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestWrapper
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
      <TestWrapper
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

test('only notifications to the current network show in the menu', () => {
  let socket: MockWebSocket;
  const {getByTestId, queryByText} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestWrapper
        {...props}
        currentNetwork={defaultTestNetwork}
        webSocketProviderProps={{
          socketFactory: () => (socket = new MockWebSocket()),
        }}
      />
    ),
  });
  clickButton(getByTestId('menu-toggle'));
  act(() => {
    triggerGenericMessage(socket, {
      message: 'another topology message',
      topologyName: 'another topology',
    });
  });
  expect(queryByText('another topology message')).not.toBeInTheDocument();

  act(() => {
    triggerGenericMessage(socket, {
      message: 'message to default topology',
      topologyName: defaultTestNetwork,
    });
  });
  expect(queryByText('message to default topology')).toBeInTheDocument();
});

test('show notifications with empty topologyName for backwards compatibility', () => {
  let socket: MockWebSocket;
  const {getByTestId, queryByText} = render(<NotificationMenu />, {
    wrapper: props => (
      <TestWrapper
        {...props}
        currentNetwork={defaultTestNetwork}
        webSocketProviderProps={{
          socketFactory: () => (socket = new MockWebSocket()),
        }}
      />
    ),
  });
  clickButton(getByTestId('menu-toggle'));
  act(() => {
    triggerGenericMessage(socket, {
      message: 'empty string topology',
      topologyName: '',
    });
  });
  expect(queryByText('empty string topology')).toBeInTheDocument();

  act(() => {
    triggerGenericMessage(socket, {
      message: 'undefined topology',
      topologyName: undefined,
    });
  });
  expect(queryByText('undefined topology')).toBeInTheDocument();
});

// wrapper specific to notification menu tests
function TestWrapper({
  children,
  currentNetwork = defaultTestNetwork,
  webSocketProviderProps,
  ...props
}) {
  return (
    <TestApp {...props}>
      <WebSocketProvider
        socketFactory={() => new MockWebSocket()}
        {...(webSocketProviderProps || {})}>
        >
        <NetworkListContext.Provider
          value={Object.assign(defaultContextValue, {
            getNetworkName: () => currentNetwork,
          })}>
          {children}
        </NetworkListContext.Provider>
      </WebSocketProvider>
    </TestApp>
  );
}

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
  {
    message = defaultTestMessage,
    topologyName = defaultTestNetwork,
  }: {message: string, topologyName?: string} = {
    message: defaultTestMessage,
    topologyName: defaultTestNetwork,
  },
) {
  socket.triggerMessage(
    new WebSocketMessage({
      key: null,
      group: 'events',
      payload: {
        offset: offsetCounter++,
        value: JSON.stringify({reason: message, topologyName}),
      },
    }),
  );
}
