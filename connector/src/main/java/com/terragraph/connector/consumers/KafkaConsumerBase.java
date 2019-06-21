/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.consumers;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.connector.serdes.JsonDeserializer;

/**
 * Abstract base class for Kafka consumers.
 *
 * @param <T> the Kafka value type
 */
public abstract class KafkaConsumerBase<T> {
	private static final Logger logger = LoggerFactory.getLogger(KafkaConsumerBase.class);

	/** The consumer poll timeout duration. */
	private static final Duration POLL_TIMEOUT = Duration.ofMillis(100);

	/** The paramterized class. */
	private final Class<T> clazz;

	/** The Kafka consumer group ID. */
	protected final String groupId;

	/** The Kafka topic. */
	protected final String topic;

	/** The thread executor. */
	private final ExecutorService executor;

	/** The Kafka consumer properties. */
	private final Properties consumerProperties;

	/** The number of records read so far. */
	private long recordsRead = 0;

	/** Initialize the Kafka consumer. */
	public KafkaConsumerBase(
		Class<T> clazz, String groupId, String bootstrapServers, String topic, Map<String, String> consumerConfig
	) {
		this.clazz = clazz;
		this.groupId = groupId;
		this.topic = topic;
		this.executor = Executors.newSingleThreadExecutor(r -> new Thread(r, groupId));
		this.consumerProperties = getProperties(groupId, bootstrapServers, consumerConfig);
	}

	/** Return the Kafka consumer properties. */
	private Properties getProperties(String groupId, String bootstrapServers, Map<String, String> consumerConfig) {
		Properties props = new Properties();
		for (Map.Entry<String, String> entry : consumerConfig.entrySet()) {
			props.setProperty(entry.getKey(), entry.getValue());
		}
		props.setProperty("bootstrap.servers", bootstrapServers);
		props.setProperty("group.id", groupId);
		props.setProperty("enable.auto.commit", "false");
		return props;
	}

	/** Start the consumer. */
	public void start() {
		executor.submit(this::run);
		addShutdownHook();
	}

	/** Add a shutdown hook. */
	private void addShutdownHook() {
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			shutdown();
		}));
	}

	/** Clean up resources. */
	protected void shutdown() {
		if (!executor.isShutdown()) {
			executor.shutdownNow();
		}
	}

	/** Initialize resources. */
	protected void init() {}

	/** Run the consumer loop. */
	private void run() {
		init();

		try (
			KafkaConsumer<String, T> consumer = new KafkaConsumer<String, T>(
				consumerProperties, new StringDeserializer(), new JsonDeserializer<T>(clazz))
		) {
			// Subscribe to topic
			logger.info("[{}] Subscribing to topic: {}", groupId, topic);
			consumer.subscribe(Arrays.asList(topic));

			// Poll continuously
			while (!Thread.currentThread().isInterrupted()) {
				poll(consumer);
			}
		}
	}

	/** Poll for records. */
	protected void poll(Consumer<String, T> consumer) {
		ConsumerRecords<String, T> records = consumer.poll(POLL_TIMEOUT);
		if (records.count() > 0) {
			logger.debug("[{}] Received {} record(s) from topic '{}'.", groupId, records.count(), topic);
		}
		consume(consumer, records);
		recordsRead += records.count();
	}

	/** Return the number of records read so far. */
	public long recordsRead() { return recordsRead; }

	/** Consume records. */
	protected abstract void consume(Consumer<String, T> consumer, ConsumerRecords<String, T> records);
}
