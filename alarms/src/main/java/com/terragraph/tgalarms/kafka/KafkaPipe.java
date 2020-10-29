/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.kafka;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.processor.ProcessorSupplier;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.state.QueryableStoreTypes;
import org.apache.kafka.streams.state.ReadOnlyKeyValueStore;
import org.apache.kafka.streams.state.StoreBuilder;
import org.apache.kafka.streams.state.Stores;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.tgalarms.AlarmService;
import com.terragraph.tgalarms.kafka.serdes.AlarmSerde;
import com.terragraph.tgalarms.kafka.serdes.JsonDeserializer;
import com.terragraph.tgalarms.kafka.serdes.JsonSerializer;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Event;

/**
 * Kafka Streams data pipe.
 */
public class KafkaPipe {
	private static final Logger logger = LoggerFactory.getLogger(KafkaPipe.class);

	/** The Kafka application ID. */
	protected static final String APPLICATION_ID = "tg-alarm-service";

	/** The Kafka alarm store name. */
	protected static final String ALARM_STORE_NAME = "alarm-store";

	/** The KafkaAlarmProcessor punctuation interval. */
	private static final Duration punctuationInterval = Duration.ofMillis(1000);

	/** The alarm service instance. */
	private final AlarmService alarmService;

	/** Constructor. */
	public KafkaPipe(AlarmService service) {
		this.alarmService = service;
	}

	/** Start the pipe. */
	public void start(String bootstrapServers, String sourceTopic, String sinkTopic) {
		// Configure Kafka Streams instance
		final KafkaStreams streams = buildStreams(bootstrapServers, sourceTopic, sinkTopic);
		streams.setStateListener((newState, oldState) -> {
			// Initialize alarm service using State Store
			if (newState == KafkaStreams.State.RUNNING) {
				loadInitialAlarms(
					alarmService,
					streams.store(ALARM_STORE_NAME, QueryableStoreTypes.keyValueStore())
				);
			}
		});
		streams.start();
		logger.info("Kafka Streams started using servers '{}'...", bootstrapServers);

		// Add shutdown hook to clean up
		addShutdownHook(streams);
	}

	/** Shutdown hook to clean up executors. */
	private void addShutdownHook(KafkaStreams streams) {
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			streams.close();
		}));
	}

	/** Configure the Kafka Streams instance. */
	private KafkaStreams buildStreams(String bootstrapServers, String sourceTopic, String sinkTopic) {
		// Create persistent State Store builder
		StoreBuilder<KeyValueStore<String, Alarm>> alarmStoreBuilder = Stores.keyValueStoreBuilder(
			Stores.persistentKeyValueStore(ALARM_STORE_NAME), Serdes.String(), new AlarmSerde()
		);

		// Build topology
		Topology topology = buildTopology(
			sourceTopic,
			sinkTopic,
			() -> new KafkaAlarmProcessor(alarmService, ALARM_STORE_NAME, punctuationInterval),
			alarmStoreBuilder
		);
		logger.debug(topology.describe().toString());

		// Set stream properties
		Properties props = new Properties();
		props.put(StreamsConfig.APPLICATION_ID_CONFIG, APPLICATION_ID);
		props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
		props.put(StreamsConfig.consumerPrefix(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG), "latest");

		return new KafkaStreams(topology, props);
	}

	/** Build the Kafka Streams topology. */
	protected static Topology buildTopology(
		String sourceTopic,
		String sinkTopic,
		@SuppressWarnings("rawtypes") ProcessorSupplier supplier,
		StoreBuilder<KeyValueStore<String, Alarm>> alarmStoreBuilder
	) {
		final String sourceName = "Source";
		final String processorName = "AlarmsProcessor";
		final String sinkName = "Sink";
		Topology topology = new Topology();
		topology.addSource(sourceName, new StringDeserializer(), new JsonDeserializer<Event>(Event.class), sourceTopic)
			.addProcessor(processorName, supplier, sourceName)
			.addStateStore(alarmStoreBuilder, processorName)
			.addSink(sinkName, sinkTopic, new StringSerializer(), new JsonSerializer<Alarm>(), processorName);
		return topology;
	}

	/** Load all initial alarms from the State Store. */
	protected static void loadInitialAlarms(
		AlarmService alarmService, ReadOnlyKeyValueStore<String, Alarm> alarmStore
	) {
		List<Alarm> initialAlarms = new ArrayList<>();
		try (KeyValueIterator<String, Alarm> iter = alarmStore.all()) {
			while (iter.hasNext()) {
				KeyValue<String, Alarm> entry = iter.next();
				initialAlarms.add(entry.value);
			}
		}
		alarmService.loadAlarms(initialAlarms);
	}
}
