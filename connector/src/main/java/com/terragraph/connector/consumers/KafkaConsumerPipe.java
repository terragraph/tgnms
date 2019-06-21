/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.consumers;

import java.util.Map;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.connector.endpoints.Client;

/**
 * Kafka consumer pipe that consumes records and sends them elsewhere via a supplied client.
 *
 * @param <T> the Kafka value type
 */
public class KafkaConsumerPipe<T> extends KafkaConsumerBase<T> {
	private static final Logger logger = LoggerFactory.getLogger(KafkaConsumerPipe.class);

	/** The client request retry delay (in ms). */
	private static final long CLIENT_RETRY_MS = 1000;

	/** The client for submitting Kafka data externally. */
	private final Client<T> client;

	/**
	 * Constructor.
	 * @param clazz the class of the Kafka value type
	 * @param groupId the Kafka consumer group ID
	 * @param bootstrapServers the Kafka bootstrap servers
	 * @param topic the Kafka source topic
	 * @param consumerConfig the Kafka consumer configuration
	 * @param client the sink client
	 */
	public KafkaConsumerPipe(
		Class<T> clazz,
		String groupId,
		String bootstrapServers,
		String topic,
		Map<String, String> consumerConfig,
		Client<T> client
	) {
		super(clazz, groupId, bootstrapServers, topic, consumerConfig);
		this.client = client;
	}

	@Override
	protected void init() {
		super.init();
		client.init();
	}

	@Override
	protected void shutdown() {
		super.shutdown();
		client.close();
	}

	@Override
	protected void consume(Consumer<String, T> consumer, ConsumerRecords<String, T> records) {
		// Receive new records
		for (ConsumerRecord<String, T> record : records) {
			client.enqueue(record.value());
		}

		// Send queued entries?
		while (client.shouldSubmit()) {
			if (client.submit()) {
				// Success - persist the current offset
				logger.debug("[{}] Committing offset...", groupId);
				consumer.commitSync();
				break;
			} else {
				// Submit failed - wait and try again
				try {
					Thread.sleep(CLIENT_RETRY_MS);
				} catch (InterruptedException e) {
					break;
				}
			}
		}
	}
}
