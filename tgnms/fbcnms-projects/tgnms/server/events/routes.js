/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import websocketService from '../websockets/service';
import {subscribe} from './eventStream';
import type {KafkaMessage} from './KafkaTypes';

const express = require('express');
const router = express.Router();

/**
 * Send all Kafka messages that NMS receives to a group named after the topic.
 *
 * On startup:
 *   NMS creates a kafka single consumer for the topics it cares about. Every
 *   message received from kafka is sent to the corresponding websocket group.
 *
 * On page-load:
 *   A single websocket connection is made from browser to NMS. The ui can
 *   then determine which websocket groups it wants to listen to. By default,
 *   it joins the 'events' group to stream events from kafka to the
 *   notifications ui.
 */
subscribe((message: KafkaMessage) => {
  websocketService.messageGroup(message.topic, message);
});

module.exports = router;
