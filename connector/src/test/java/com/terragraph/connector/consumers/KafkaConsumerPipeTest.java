/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.consumers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.HashMap;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.MockConsumer;
import org.apache.kafka.clients.consumer.OffsetResetStrategy;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.terragraph.connector.DefaultTestWatcher;
import com.terragraph.connector.consumers.KafkaConsumerPipe;
import com.terragraph.connector.endpoints.MockClient;
import com.terragraph.connector.models.Config;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
public class KafkaConsumerPipeTest {
	/** The Kafka topic name. */
	private static final String TOPIC_NAME = "test";

	/** The mock consumer instance. */
	private MockConsumer<String, String> mockConsumer;

	/** The consumer pipe instance. */
	private KafkaConsumerPipe<String> consumerPipe;

	/** The mock client instance. */
	private MockClient<String> mockClient;

	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);

		// Initialize mock consumer
		mockConsumer = new MockConsumer<String, String>(OffsetResetStrategy.EARLIEST);
		mockConsumer.assign(Arrays.asList(new TopicPartition(TOPIC_NAME, 0)));
		HashMap<TopicPartition, Long> beginningOffsets = new HashMap<>();
		beginningOffsets.put(new TopicPartition(TOPIC_NAME, 0), 0L);
		mockConsumer.updateBeginningOffsets(beginningOffsets);

		// Initialize mock client
		mockClient = new MockClient<String>();

		// Initialize consumer pipe
		Config config = Config.createDefaultConfig();
		consumerPipe = new KafkaConsumerPipe<>(
			String.class,
			"unit-test-group",
			"unit_test",
			TOPIC_NAME,
			config.kafkaParams.consumerConfig,
			mockClient
		);
	}

	@AfterEach
	void tearDown() {
		if (mockConsumer != null) {
			mockConsumer.close();
			mockConsumer = null;
		}
	}

	@Test
	@Order(1)
	void testBasicFunctionality() throws Exception {
		// Add records
		String records[] = {"tomato", "potato"};
		for (int i = 0; i < records.length; i++) {
			mockConsumer.addRecord(new ConsumerRecord<String, String>(TOPIC_NAME, 0, i, null, records[i]));
		}

		// Consume records
		consumerPipe.poll(mockConsumer);
		assertEquals(records.length, consumerPipe.recordsRead());
		assertTrue(Arrays.asList(records).equals(mockClient.getSubmitted()));
	}
}
