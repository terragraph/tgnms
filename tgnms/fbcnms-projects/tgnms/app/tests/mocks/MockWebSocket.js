/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 * JSDOM doesn't support extending EventTarget, which WebSocket inherits from.
 * (https://github.com/jsdom/jsdom/issues/2156)
 * So instead we'll extend EventEmitter and just smooth over the api a bit.
 */

import EventEmitter from 'events';

import {
  WEBSOCKET_READYSTATE,
  WebSocketMessage,
} from '../../../shared/dto/WebSockets';

/**
 * create a fake type for MockWebSocket to let flow know it's ok to use
 * MockWebsocket in place of a websocket
 */
export type MockWebSocketType = WebSocket & {
  triggerOpen: () => void,
  triggerClose: () => void,
  triggerMessage: () => void,
};

export default class MockWebSocket extends EventEmitter {
  readyState = WEBSOCKET_READYSTATE.CLOSED;
  // eslint-disable-next-line no-undef
  send = jest.fn<any, any>();

  addEventListener = (eventName: string, listener: Function) => {
    return this.on(eventName, listener);
  };

  removeEventListener = (eventName: string, listener: Function) => {
    return this.off(eventName, listener);
  };

  triggerOpen = () => {
    this.readyState = WEBSOCKET_READYSTATE.OPEN;
    this.emit('open');
  };

  triggerClose = () => {
    this.readyState = WEBSOCKET_READYSTATE.CLOSED;
    this.emit('close');
  };

  triggerMessage = (message: WebSocketMessage<any>) => {
    this.emit('message', {
      data: JSON.stringify(message),
    });
  };
}
