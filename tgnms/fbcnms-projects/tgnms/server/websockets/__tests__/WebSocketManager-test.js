/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import EventEmitter from 'events';
import WebSocketManager from '../WebSocketManager';
jest.useFakeTimers();
let manager: WebSocketManager;
beforeEach(() => {
  manager = new WebSocketManager();
});

describe('joinGroup(s)', () => {
  test('creates a group if it does not exist', () => {
    expect(manager.groups['test']).toBeUndefined;
    const socket = new MockWebSocket();
    manager.joinGroup('test', socket);
    const group = manager.groups['test'];
    expect(group).not.toBeUndefined;
  });

  test('adds a socket to the group', () => {
    const socket = new MockWebSocket();
    manager.joinGroup('test', socket);
    const group = manager.groups['test'];
    expect(group.sockets.has(socket)).toBeTrue;
  });

  test('if a socket closes, remove it from all groups', () => {
    const socket = new MockWebSocket();
    manager.joinGroups(['test1', 'test2', 'test3'], socket);
    expect(manager.groups['test1'].sockets.has(socket)).toBeTrue;
    expect(manager.groups['test2'].sockets.has(socket)).toBeTrue;
    expect(manager.groups['test3'].sockets.has(socket)).toBeTrue;
    (socket: any).emit('close');
    expect(manager.groups['test1'].sockets.has(socket)).toBeFalse;
    expect(manager.groups['test2'].sockets.has(socket)).toBeFalse;
    expect(manager.groups['test3'].sockets.has(socket)).toBeFalse;
    expect(manager.groups['test1'].sockets.size).toBe(0);
    expect(manager.groups['test2'].sockets.size).toBe(0);
    expect(manager.groups['test3'].sockets.size).toBe(0);
  });

  test('adds socket to multiple groups', () => {
    const socket = new MockWebSocket();
    manager.joinGroups(['test1', 'test2'], socket);
    let group = manager.groups['test1'];
    expect(group.sockets.has(socket)).toBeTrue;
    group = manager.groups['test2'];
    expect(group.sockets.has(socket)).toBeTrue;
  });
});

describe('leaveGroup(s)', () => {
  test('removes socket from a group', () => {
    const socket = new MockWebSocket();
    manager.joinGroup('test', socket);
    let group = manager.groups['test'];
    expect(group).not.toBeUndefined;
    manager.leaveGroup('test', socket);
    group = manager.groups['test'];
    expect(group).toBeUndefined;
    expect(manager.socketData.get(socket)).toBeUndefined;
  });
});

describe('messageGroup', () => {
  test('sends a message to all members of the specified group', () => {
    const socket1 = new MockWebSocket();
    const socket2 = new MockWebSocket();
    const socket3 = new MockWebSocket();

    // add all sockets to the same group
    manager.joinGroup('test', socket1);
    manager.joinGroup('test', socket2);
    manager.joinGroup('test', socket3);

    // add each socket to individual groups
    manager.joinGroup('socket1', socket1);
    manager.joinGroup('socket2', socket2);
    manager.joinGroup('socket3', socket3);
    manager.messageGroup('test', {message: 'hello group'});
    expect(socket1.send).toHaveBeenLastCalledWith(
      '{"key":null,"group":"test","payload":{"message":"hello group"}}',
    );
    expect(socket2.send).toHaveBeenLastCalledWith(
      '{"key":null,"group":"test","payload":{"message":"hello group"}}',
    );
    expect(socket3.send).toHaveBeenLastCalledWith(
      '{"key":null,"group":"test","payload":{"message":"hello group"}}',
    );

    manager.messageGroup('socket1', {message: 'hello socket 1'});
    expect(socket1.send).toHaveBeenLastCalledWith(
      '{"key":null,"group":"socket1","payload":{"message":"hello socket 1"}}',
    );
    manager.messageGroup('socket2', {message: 'hello socket 2'});
    expect(socket2.send).toHaveBeenLastCalledWith(
      '{"key":null,"group":"socket2","payload":{"message":"hello socket 2"}}',
    );
    manager.messageGroup('socket3', {message: 'hello socket 3'});
    expect(socket3.send).toHaveBeenLastCalledWith(
      '{"key":null,"group":"socket3","payload":{"message":"hello socket 3"}}',
    );
  });
});

describe('heartbeats', () => {
  test('if the manager does not receive heartbeats, the socket is terminated', () => {
    manager.startHeartbeatChecker();
    const socket = new MockWebSocket();
    manager.joinGroups(['test1', 'test2'], socket);
    jest.runOnlyPendingTimers();
    expect(socket.ping).toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(socket.terminate).toHaveBeenCalled();
    expect(manager.groups['test1'].sockets.size).toBe(0);
    expect(manager.groups['test2'].sockets.size).toBe(0);
  });

  test('if the manager does receive heartbeats, do not terminate the socket', () => {
    manager.startHeartbeatChecker();
    const socket = new MockWebSocket();
    socket.ping = jest.fn(() => socket.emit('pong'));
    manager.joinGroups(['test1', 'test2'], socket);
    jest.runOnlyPendingTimers();
    expect(socket.ping).toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(socket.terminate).not.toHaveBeenCalled();
    expect(manager.groups['test1'].sockets.has(socket)).toBeTrue;
    expect(manager.groups['test2'].sockets.has(socket)).toBeTrue;
    expect(manager.groups['test1'].sockets.size).toBe(1);
    expect(manager.groups['test2'].sockets.size).toBe(1);
  });
});

class MockWebSocket extends EventEmitter {
  readyState = 1;
  send = jest.fn();
  ping = jest.fn();
  close = jest.fn();
  terminate = jest.fn(() => {
    this.emit('close');
  });
  binaryType: string;
  bufferedAmount: number;
  url: string;
  protocol: string;
}
