/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import websocketService from './service';
import {Api} from '../Api';
import type WebSocket from 'ws';

type WSRouter = {
  ws: (string, (ws: WebSocket) => void) => void,
};

export default class MyRoute extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    if (process.env.WEBSOCKETS_ENABLED) {
      ((router: any): WSRouter).ws('/', ws => {
        ws.on('message', (messageJson: string) => {
          try {
            const parsed = JSON.parse(messageJson);
            websocketService.processCommand(parsed, ws);
          } catch (err) {
            ws.send();
          }
        });
        ws.on('close', () => {
          websocketService.leaveAllGroups(ws);
        });
      });
    }
    return router;
  }
}
