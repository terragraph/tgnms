/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {
  WEBSOCKET_READYSTATE,
  WEB_SOCKET_COMMAND_TYPE,
  WebSocketMessage,
} from '../shared/dto/WebSockets';
import type {WebSocketCommand} from '../shared/dto/WebSockets';

export type WebSocketContextType = {|
  getRawSocket: () => ?WebSocket,
  joinGroup: (
    groupName: string,
    listener: WebSocketMessageListener<any>,
  ) => Function,
  isOpen: boolean,
|};

export const WebSocketContext = React.createContext<WebSocketContextType>({
  getRawSocket: () => null,
  joinGroup: (_groupName, _listener) => () => {},
  isOpen: false,
});

export type WebSocketProviderProps = {|
  children: React.Element<any>,
  path?: string,
  socketFactory?: WebSocketFactory,
|};

type WebSocketMessageListener<T> = {
  (message: WebSocketMessage<T>): any,
};

type WebSocketFactory = {
  ({path: string} | void): WebSocket,
};

type GroupDef = {
  name: string,
  listeners: Set<WebSocketMessageListener<any>>,
};

export function WebSocketProvider({
  children,
  path,
  socketFactory,
}: WebSocketProviderProps) {
  const {socket, isOpen, send} = useDurableWebSocket({
    socketFactory,
    path,
  });
  const groupRef = React.useRef<Map<string, GroupDef>>(new Map());

  // implement the WebSocketContext api
  const providerValue = React.useMemo(() => {
    function joinGroup(
      groupName: string,
      listener: WebSocketMessageListener<any>,
    ) {
      const joinGroupCommand: WebSocketCommand<string> = {
        type: WEB_SOCKET_COMMAND_TYPE.JOIN_GROUP,
        payload: groupName,
      };
      send(JSON.stringify(joinGroupCommand));
      let groupDef = groupRef.current.get(groupName);
      if (!groupDef) {
        groupDef = {
          name: groupName,
          listeners: new Set(),
        };
        groupRef.current.set(groupName, groupDef);
      }
      groupDef.listeners.add(listener);

      return () => leaveGroup(groupName, listener);
    }

    function leaveGroup(
      groupName: string,
      listener: WebSocketMessageListener<any>,
    ) {
      const groupDef = groupRef.current.get(groupName);
      if (!groupDef) {
        return;
      }
      groupDef.listeners.delete(listener);
      // if there are no listeners on the client, leave on the server too
      if (groupDef.listeners.size < 1) {
        const leaveGroupCommand: WebSocketCommand<string> = {
          type: WEB_SOCKET_COMMAND_TYPE.LEAVE_GROUP,
          payload: groupName,
        };
        send(JSON.stringify(leaveGroupCommand));
        groupRef.current.delete(groupName);
      }
    }

    return {
      getRawSocket: () => socket,
      isOpen,
      joinGroup,
    };
  }, [send, isOpen, socket]);

  // tell server to rejoin groups on reconnect
  React.useEffect(() => {
    if (isOpen) {
      for (const [_, groupDef] of groupRef.current) {
        send(
          JSON.stringify({
            type: WEB_SOCKET_COMMAND_TYPE.JOIN_GROUP,
            payload: groupDef.name,
          }),
        );
      }
    }
  }, [isOpen, socket, send]);

  // register one message listener to dispatch messages to groups
  React.useEffect(() => {
    if (socket) {
      function listener(messageEvent: MessageEvent) {
        try {
          const message = WebSocketMessage.fromEvent(messageEvent);
          const group = groupRef.current.get(message.group);
          if (group) {
            for (const listener of group.listeners) {
              listener(message);
            }
          }
        } catch (err) {
          console.error('malformed json', err);
        }
      }
      socket.addEventListener('message', listener);

      /*
       * This effect is tied to the lifecycle of the websocket,
       * so removing the event listener is not strictly necessary. However, when
       * another dependency is inevitably added to this effect, it will
       * run more often and add duplicate event listeners. This protects us
       * against that
       */
      return () => socket.removeEventListener('message', listener);
    }
  }, [socket]);

  return (
    <WebSocketContext.Provider value={providerValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

function defaultSocketFactory(params: void | {path: string}): WebSocket {
  const {path} = params ? params : {path: '/websockets'};
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUriBase = new URL(wsProto + '//' + window.location.host);
  const wsUri = new URL(path, wsUriBase);
  const socket = new WebSocket(wsUri.toString());
  return socket;
}

/*
 * Creates a websocket which handles 2 main problems:
 *  - reconnect after going offline
 *  - enqueueing messages while offline to send when back online
 *
 * the basic logic is:
 *   if a message is sent while offline, enqueue it, else send normally
 *   Once online, send all queued messages
 *   if the socket goes offline, create a new socket
 *   when the socket comes back online, process queued messages
 *
 * The message queueing is especially useful because react components may
 * join groups during the initial render phase, long before the socket
 * is actually connected. Once the socket actually connects, the components
 * will automatically be part of the groups.
 */
export function useDurableWebSocket(
  {
    socketFactory = defaultSocketFactory,
  }: {
    socketFactory?: WebSocketFactory,
  } = {socketFactory: defaultSocketFactory},
): {socket: ?WebSocket, isOpen: boolean, send: (json: string) => any} {
  const [socket, setSocket] = React.useState<?WebSocket>(null);
  const messageQueue = React.useRef<Array<string>>([]);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const socketFactoryRef = React.useRef(socketFactory);
  /*
   * creates a socket using the provided factory. If the socket goes offline or
   * fails to connect, a new one is created. When the socket opens, all
   * enqueued messages are sent.
   */
  React.useEffect(() => {
    let reconnectTimeout: TimeoutID;
    function createSocket() {
      clearTimeout(reconnectTimeout);
      const processMessageQueue = sock => {
        while (
          messageQueue.current.length > 0 &&
          sock.readyState === WEBSOCKET_READYSTATE.OPEN
        ) {
          const message = messageQueue.current.shift();
          try {
            if (sock) {
              sock.send(message);
            }
          } catch (error) {
            console.error('websocket error', error);
          }
        }
      };
      const sock = socketFactoryRef.current();
      sock.addEventListener('open', () => {
        clearTimeout(reconnectTimeout);
        setIsOpen(true);
        processMessageQueue(sock);
      });
      /*
       * This runs whenever the websocket loses connection to the server,
       * or after it fails to connect initially.
       */
      sock.addEventListener('close', () => {
        setIsOpen(false);
        reconnectTimeout = setTimeout(() => setSocket(createSocket()), 2000);
      });
      return sock;
    }
    setSocket(createSocket());
  }, []);

  // if the websocket is offline, enqueue the messages and send them later
  const send = React.useCallback(
    message => {
      if (socket && socket.readyState === WEBSOCKET_READYSTATE.OPEN) {
        socket.send(message);
      } else {
        messageQueue.current.push(message);
      }
    },
    [socket, messageQueue],
  );
  return {
    isOpen,
    socket,
    send,
  };
}

/*
 * Hook which listens to messages to the specified group. Automatically stops
 * listening when the component unmounts
 */
export function useWebSocketGroup<T: any>(
  name: string,
  listener: WebSocketMessageListener<T>,
) {
  const listenerRef = React.useRef<WebSocketMessageListener<T>>(listener);
  const webSocketContext = React.useContext(WebSocketContext);

  React.useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  React.useEffect(() => {
    const handleMessage = (message: WebSocketMessage<T>) => {
      listenerRef.current(message);
    };
    const leaveGroup = webSocketContext.joinGroup(name, handleMessage);
    return leaveGroup;
  }, [name, listenerRef, webSocketContext]);
}

export default WebSocketContext;
