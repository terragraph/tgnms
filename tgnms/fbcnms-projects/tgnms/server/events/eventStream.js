/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @flow
 * @format
 */
const logger = require('../log')(module);
import uuidv1 from 'uuid/v1';
import {ConsumerGroup} from 'kafka-node';
import {KAFKA_HOSTS} from '../config';

let consumerGroup: ConsumerGroup;
initConsumerGroup();

function initConsumerGroup() {
  const options = {
    /**
     * Optional client identifier.
     * The sole purpose of this is to be able to track the source of requests
     * beyond just ip and port by allowing a logical application name to be
     * included in Kafka logs and monitoring aggregates.
     */
    id: 'tgnms',
    /*
     * connect directly to kafka broker (instantiates a KafkaClient)
     */
    kafkaHost: KAFKA_HOSTS,
    ssl: true, // optional (defaults to false) or tls options hash
    /*
     * Kafka will load-balance a group's messages to every group member. If 2
     * versions of NMS are running with the same groupId, they will each see
     * half of the messages. Each NMS instance needs to receive every
     * single event for a given topic, so the groupid needs to be a UUID. Note
     * that the UUID will change every time the NMS is restarted
     */
    groupId: `tgnms-${uuidv1()}`,

    /*
     * Offsets to use for new groups other options could be 'earliest' or 'none'
     * (none will emit an error if no offsets were saved) equivalent to Java
     * client's auto.offset.reset
     */
    fromOffset: 'latest', // default

    /**
     * commitOffsetsOnFirstJoin and autoCommit tells kafka that NMS should
     * NEVER commit any offsets because all messages should flow through in
     * realtime. NMS only cares about events that are ocurring now. It does

     * not care about receiving events that occurred while it was not listening.
     */
    commitOffsetsOnFirstJoin: false,
    autoCommit: false,
    sessionTimeout: 15000,
  };

  if (typeof KAFKA_HOSTS !== 'string') {
    logger.error('Cannot connect to kafka broker. KAFKA_HOSTS is undefined.');
    return;
  }

  consumerGroup = new ConsumerGroup(options, ['events']);
  // set the env var DEBUG=kafka-node:* to show kafka client debug logs
  consumerGroup.on('error', function (message) {
    logger.error(message);
  });
}

export function subscribe(callback: (message: any) => any) {
  if (consumerGroup) {
    consumerGroup.on('message', callback);
  }
}
