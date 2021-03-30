/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * Global singleton websocket manager
 */

import WebSocketManager from '../websockets/WebSocketManager';
const manager = new WebSocketManager();
manager.startHeartbeatChecker();
export default manager;
