/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 *
 * Manage groups of websockets. Allows the application to send messages to
 * groups of sockets or a single socket. UI opens a single websocket
 * connection, backend broadcasts messages to "groups".
 *
 */
const logger = require('../log')(module);
import type {WebSocketCommand} from '../../shared/dto/WebSockets';
import {
  WebSocketMessage,
  WEB_SOCKET_COMMAND_TYPE,
  WEBSOCKET_READYSTATE,
} from '../../shared/dto/WebSockets';

export default class WebSocketManager {
  // maps from a group name to a set of websockets.
  groups: SocketGroups = {};
  // additional data about a websocket
  socketData: Map<WebSocket, SocketData> = new Map();

  /*
   * Allows clients to call websocket manager functions. By sending websocket
   * commands, the client can join groups and leave groups dynamically.
   */
  processCommand = (e: WebSocketCommand<any>, socket: WebSocket) => {
    logger.debug(`processing command ${e.type}`);
    switch (e.type) {
      case WEB_SOCKET_COMMAND_TYPE.JOIN_GROUP:
        this.joinGroup(e.payload, socket);
        break;
      case WEB_SOCKET_COMMAND_TYPE.LEAVE_GROUP:
        this.leaveGroup(e.payload, socket);
        break;
    }
  };

  /*
   * Sends a message to all sockets that are members
   * of the named group.
   */
  messageGroup = (name: string, payload: any) => {
    const group = this.groups[name];
    if (!group) {
      return;
    }
    logger.debug(`messaging group ${name}`);
    const message = new WebSocketMessage<any>({
      key: null,
      group: name,
      payload,
    });

    const serialized = JSON.stringify(message);
    for (const socket of group.sockets) {
      if (socket.readyState === WEBSOCKET_READYSTATE.OPEN) {
        socket.send(serialized);
      }
    }
  };

  /*
   * Adds a websocket to a group. WebSockets in this group will receive
   * all messages to this group. Some examples of groups might be:
   * events - kafka events topic
   * user-1 - all websockets that belong to user #1. Can be used to send
   *   messages directly to a specific user.
   * node-logs-ff:cc:aa:bb - listen to nodelogs for a node with mac ff:cc:aa:bb.
   *   The server can poll the node logs only once and redistribute them to
   *   multiple users.
   */
  joinGroup = (name: string, socket: Object) => {
    if (!this.groups[name]) {
      this.groups[name] = this.createGroup(name);
    }
    // if the user is already a part of the group, ignore
    if (!this.groups[name].sockets.has(socket)) {
      logger.debug(`websocket joining group ${name}`);
      this.groups[name].sockets.add(socket);

      let data = this.socketData.get(socket);
      /*
       * if the socket's data does not yet exist, create it and perform
       * one-time setup.
       */
      if (!data) {
        data = this.createSocketData();
        socket.on('close', () => {
          logger.debug('socket closing. leaving all groups');
          this.leaveAllGroups(socket);
          this.socketData.delete(socket);
        });
        /*
         * Server sends 'ping' messages on an interval as part of the heartbeat
         * checker. When the server receives this 'pong' response, it knows the
         * client socket is still connected and should not be closed.
         */
        socket.on('pong', () => {
          if (data) {
            data.isAlive = true;
          }
        });
        this.socketData.set(socket, data);
      }
      data.groups.add(name);
    }
  };

  joinGroups = (groupNames: Array<string>, socket: WebSocket) => {
    groupNames.forEach(name => this.joinGroup(name, socket));
  };

  leaveGroup = (name: string, socket: Object) => {
    logger.debug(`websocket leaving group ${name}`);
    if (this.groups[name].sockets.has(socket)) {
      this.groups[name].sockets.delete(socket);
      logger.debug(`websocket deleted from group ${name}`);
      const socketData = this.socketData.get(socket);
      if (socketData) {
        socketData.groups.delete(name);
      }
    }
  };

  leaveAllGroups = (socket: WebSocket) => {
    const data = this.socketData.get(socket);
    if (data) {
      logger.debug(`leaving groups: ${Array.from(data.groups).join(',')}`);
      for (const group of data.groups) {
        this.leaveGroup(group, socket);
      }
    }
  };

  /*
   * Send ping messages to all connected clients. If they do not send back
   * a pong response, terminate them.
   */
  startHeartbeatChecker = () => {
    setInterval(() => {
      for (const [socket, data] of this.socketData.entries()) {
        if (data.isAlive === false) {
          return socket.terminate();
        }
        data.isAlive = false;
        socket.ping(noop);
      }
    }, 5000);
  };

  createGroup = (name: string) => ({name, sockets: new Set()});
  createSocketData = () => ({groups: new Set(), isAlive: true});
}

function noop() {}

export type SocketData = {
  /*
   * Groups this socket belongs to. When the socket closes, it will leave
   * all these groups.
   */
  groups: Set<string>,
  /*
   * Tracks whether the socket is responding to heartbeats. If the socket isn't
   * responding to heartbeats, isAlive will be marked as false and the socket
   * will be terminated.
   */
  isAlive: boolean,
};

export type SocketGroups = {
  [group: string]: {
    sockets: Set<WebSocket>,
  },
};

export type SocketEvent =
  | 'close'
  | 'error'
  | 'message'
  | 'open'
  | 'ping'
  | 'pong'
  | 'unexpected-response'
  | 'upgrade';

export type WebSocket = {
  binaryType: string,
  bufferedAmount: number,
  url: string,
  protocol: string,
  close: (code: number, reason: string) => any,
  on(type: SocketEvent, listener: Function): any,
  send(data: any, options?: Object, callback?: () => any): any,
  ping(x: Function): any,
  terminate: () => void,
  readyState: $Values<typeof WEBSOCKET_READYSTATE>,
};
