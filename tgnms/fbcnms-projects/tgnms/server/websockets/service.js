/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

/*
 * Global singleton websocket manager
 */

import WebSocketManager from '../websockets/WebSocketManager';
const manager = new WebSocketManager();
manager.startHeartbeatChecker();
export default manager;
