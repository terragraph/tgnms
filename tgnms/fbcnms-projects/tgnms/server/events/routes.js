/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import websocketService from '../websockets/service';
import {Api} from '../Api';
import {subscribe} from './eventStream';
import type {Message} from './KafkaTypes';

export default class EventsRoutes extends Api {
  async init() {
    this.initLogger(__filename);
  }
  makeRoutes() {
    const router = this.createApi();
    /**
     * Send all Kafka messages that NMS receives to a group named after the
     * topic.
     *
     * On startup:
     *   NMS creates a kafka single consumer for the topics it cares about.
     *   Every message received from kafka is sent to the corresponding
     *   websocket group.
     *
     * On page-load:
     *   A single websocket connection is made from browser to NMS. The ui can
     *   then determine which websocket groups it wants to listen to. By
     *   default, it joins the 'events' group to stream events from kafka to the
     *   notifications ui.
     */
    subscribe((message: Message) => {
      websocketService.messageGroup(message.topic, message);
    });
    return router;
  }
}
