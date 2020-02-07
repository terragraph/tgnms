/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

export class WebSocketMessage<T> {
  key: ?string | void;
  group: string;
  payload: T;

  constructor(init: $ReadOnly<WebSocketMessage<T>>) {
    Object.assign(this, init);
  }

  static fromEvent<T>(e: MessageEvent): WebSocketMessage<T> {
    if (typeof e.data === 'string') {
      const message = JSON.parse(e.data);
      return new WebSocketMessage<T>(message);
    } else {
      throw new Error('cannot parse MessageEvent, wrong data type');
    }
  }
}

export const WEB_SOCKET_COMMAND_TYPE = {
  JOIN_GROUP: 'JOIN_GROUP',
  LEAVE_GROUP: 'LEAVE_GROUP',
};

// Command that the client sends to the websocket server
export type WebSocketCommand<T> = {|
  type: $Values<typeof WEB_SOCKET_COMMAND_TYPE>,
  payload: T,
|};

export const WEBSOCKET_READYSTATE = {
  CONNECTING: 0, // The connection is not yet open.
  OPEN: 1, // The connection is open and ready to communicate.
  CLOSING: 2, // The connection is in the process of closing.
  CLOSED: 3, // The connection is closed.
};
