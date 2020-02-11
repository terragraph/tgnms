/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import MockWebSocket from '../../tests/mocks/MockWebSocket';
import {
  WEBSOCKET_READYSTATE,
  WebSocketMessage,
} from '../../../shared/dto/WebSockets';
import {
  WebSocketContext,
  WebSocketProvider,
  useDurableWebSocket,
  useWebSocketGroup,
} from '../WebSocketContext';
import {act, renderHook} from '@testing-library/react-hooks';
import {cleanup} from '@testing-library/react';

jest.useFakeTimers();
beforeEach(() => {
  global.WebSocket = jest
    .fn()
    .mockImplementation((...args) => new MockWebSocket(...args));
});

// automatically unmount and cleanup DOM after the test is finished.
afterEach(() => {
  cleanup();
  global.WebSocket.mockClear();
});

describe('useDurableWebSocket', () => {
  test('should not start sending messages until the socket has connected', () => {
    const {result} = renderHook(() => useDurableWebSocket(), {
      wrapper: WebSocketProvider,
    });
    act(() => {
      result.current.send(JSON.stringify({message: 'test'}));
    });
    act(() => {
      expect(result.current.socket.send).not.toHaveBeenCalled();
    });
    act(() => {
      result.current.socket.triggerOpen();
    });
    expect(result.current.socket.send).toHaveBeenCalled();
  });

  test('should reconnect after disconnecting', () => {
    global.WebSocket = createAutoConnectingMock();
    const {result} = renderHook(() => useDurableWebSocket(), {
      wrapper: WebSocketProvider,
    });
    const currentSock = result.current.socket;
    act(() => {
      jest.runAllTimers();
    });
    expect(currentSock.readyState).toBe(WEBSOCKET_READYSTATE.OPEN);
    act(() => {
      currentSock.triggerClose();
    });
    expect(currentSock.readyState).toBe(WEBSOCKET_READYSTATE.CLOSED);
    act(() => {
      jest.runAllTimers();
    });

    // we should have a new socket after reconnect attempt
    expect(currentSock).not.toBe(result.current.socket);
    expect(result.current.socket.readyState).toBe(WEBSOCKET_READYSTATE.OPEN);
  });

  test('should only attempt reconnect one at a time', () => {
    let socket;
    const socketFactory = jest.fn(() => {
      socket = new MockWebSocket();
      return socket;
    });
    renderHook(() => useDurableWebSocket(), {
      wrapper: props => (
        <WebSocketProvider socketFactory={socketFactory} {...props} />
      ),
    });
    expect(socketFactory).toHaveBeenCalledTimes(1);
    act(() => {
      socket.triggerClose();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(socketFactory).toHaveBeenCalledTimes(2);
    act(() => {
      socket.triggerClose();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(socketFactory).toHaveBeenCalledTimes(3);
  });

  test('should set isOpen in state when it opens/closes', () => {
    const {result} = renderHook(() => useDurableWebSocket(), {
      wrapper: WebSocketProvider,
    });
    expect(result.current.isOpen).toBe(false);
    act(() => {
      result.current.socket.triggerOpen();
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      result.current.socket.triggerClose();
    });
    expect(result.current.isOpen).toBe(false);
  });
});

describe('useWebSocketGroup', () => {
  test('should invoke listener after receiving messages to the group', () => {
    const mockListener = jest.fn();
    let socket: MockWebSocket;
    renderHook(() => useWebSocketGroup('test-group', mockListener), {
      wrapper: props => (
        <WebSocketProvider
          socketFactory={() => {
            socket = new MockWebSocket();
            setTimeout(() => {
              socket.triggerOpen();
            }, 0);
            return socket;
          }}
          {...props}
        />
      ),
    });
    act(() => {
      jest.runAllTimers();
    });
    act(() => {
      socket.triggerMessage(
        new WebSocketMessage({
          key: null,
          group: 'test-group',
          payload: 'test message',
        }),
      );
    });
    expect(mockListener).toHaveBeenCalledWith({
      key: null,
      group: 'test-group',
      payload: 'test message',
    });
  });
  test('should not invoke listener after receiving message to another group', () => {
    const mockListener = jest.fn();
    let socket: MockWebSocket;
    renderHook(() => useWebSocketGroup('random-group', mockListener), {
      wrapper: props => (
        <WebSocketProvider
          socketFactory={() => {
            socket = new MockWebSocket();
            setTimeout(() => {
              socket.triggerOpen();
            }, 0);
            return socket;
          }}
          {...props}
        />
      ),
    });
    act(() => {
      jest.runAllTimers();
    });
    act(() => {
      socket.triggerMessage(
        new WebSocketMessage({
          key: null,
          group: 'test-group',
          payload: 'test message',
        }),
      );
    });
    expect(mockListener).not.toHaveBeenCalled();
  });
  test('should survive reconnects', () => {
    const mockListener = jest.fn();
    let socket: MockWebSocket;
    renderHook(() => useWebSocketGroup('test-group', mockListener), {
      wrapper: props => (
        <WebSocketProvider
          socketFactory={() => (socket = new MockWebSocket())}
          {...props}
        />
      ),
    });
    act(() => {
      socket.triggerOpen();
    });
    act(() => {
      socket.triggerMessage(
        new WebSocketMessage({
          key: null,
          group: 'test-group',
          payload: 'test message',
        }),
      );
    });
    // ensure we receive the first message
    expect(mockListener).toHaveBeenCalledWith({
      key: null,
      group: 'test-group',
      payload: 'test message',
    });

    act(() => socket.triggerClose());
    act(() => socket.triggerOpen());

    act(() => {
      socket.triggerMessage(
        new WebSocketMessage({
          key: null,
          group: 'test-group',
          payload: 'test message 2',
        }),
      );
    });
    // ensure we receive the first message
    expect(mockListener).toHaveBeenLastCalledWith({
      key: null,
      group: 'test-group',
      payload: 'test message 2',
    });
  });
  test('should not reuse the listener instance', () => {
    // always use the latest listener instance to prevent using stale props
    let socket: MockWebSocket;
    let props = {
      test: 1,
    };
    const mock = jest.fn();
    renderHook(
      () =>
        useWebSocketGroup('test-group', () => {
          // capture "props" from the scope
          mock(props);
        }),
      {
        wrapper: props => (
          <WebSocketProvider
            socketFactory={() => (socket = new MockWebSocket())}
            {...props}
          />
        ),
      },
    );
    act(() => socket.triggerOpen());
    act(() =>
      socket.triggerMessage(
        new WebSocketMessage({
          group: 'test-group',
          key: null,
          payload: '',
        }),
      ),
    );
    expect(mock).toHaveBeenCalledWith({test: 1});
    props = {
      test: 2,
    };
    act(() =>
      socket.triggerMessage(
        new WebSocketMessage({
          group: 'test-group',
          key: null,
          payload: '',
        }),
      ),
    );
    expect(mock).toHaveBeenCalledWith({test: 2});
  });
});

describe('WebSocketProvider', () => {
  describe('joinGroup', () => {
    test('multiple listeners can exist for one group', () => {
      let socket: MockWebSocket;
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      renderHook(
        () => {
          const ctx = React.useContext(WebSocketContext);
          ctx.joinGroup('test-group', listener1);
          ctx.joinGroup('test-group', listener2);
        },
        {
          wrapper: props => (
            <WebSocketProvider
              {...props}
              socketFactory={() => (socket = new MockWebSocket())}
            />
          ),
        },
      );
      act(() => {
        socket.triggerOpen();
      });
      act(() => {
        socket.triggerMessage(
          new WebSocketMessage({
            key: null,
            group: 'test-group',
            payload: 'test message',
          }),
        );
      });

      expect(listener1).toHaveBeenCalledWith({
        key: null,
        group: 'test-group',
        payload: 'test message',
      });
      expect(listener2).toHaveBeenCalledWith({
        key: null,
        group: 'test-group',
        payload: 'test message',
      });
    });

    test('leaving a group stops the flow of messages', () => {
      let socket: MockWebSocket;
      let leaveGroupFn: Function;
      const listener = jest.fn();
      renderHook(
        () => {
          const ctx = React.useContext(WebSocketContext);
          leaveGroupFn = ctx.joinGroup('test-group', listener);
        },
        {
          wrapper: props => (
            <WebSocketProvider
              {...props}
              socketFactory={() => (socket = new MockWebSocket())}
            />
          ),
        },
      );

      act(() => {
        socket.triggerOpen();
      });

      act(() => {
        socket.triggerMessage(
          new WebSocketMessage({
            key: null,
            group: 'test-group',
            payload: 'test message',
          }),
        );
      });

      expect(listener).toHaveBeenCalledWith({
        key: null,
        group: 'test-group',
        payload: 'test message',
      });

      expect(listener).toHaveBeenCalledTimes(1);

      act(() => {
        leaveGroupFn();
      });

      act(() => {
        socket.triggerMessage(
          new WebSocketMessage({
            key: null,
            group: 'test-group',
            payload: 'test message',
          }),
        );
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

function createAutoConnectingMock() {
  return jest.fn().mockImplementation((...args) => {
    const socket = new MockWebSocket(...args);
    setTimeout(() => {
      socket.triggerOpen();
    }, 0);
    return socket;
  });
}
