/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

let global;
if (typeof WorkerGlobalScope !== 'undefined') {
  global = self;
} else {
  global =
    typeof window != 'undefined'
      ? window
      : (function() {
          return this;
        })();
}

const WebSocket = global.WebSocket || global.MozWebSocket;

function ws(uri, protocols, opts) {
  return protocols ? new WebSocket(uri, protocols) : new WebSocket(uri);
}

if (WebSocket) {
  ws.prototype = WebSocket.prototype;
}

module.exports = WebSocket ? ws : null;
