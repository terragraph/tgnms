/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.terragraph.tgalarms.kafka;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.TopologyTestDriver;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.streams.state.StoreBuilder;
import org.apache.kafka.streams.state.Stores;
import org.apache.kafka.streams.test.ConsumerRecordFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.terragraph.tgalarms.AlarmService;
import com.terragraph.tgalarms.DefaultTestWatcher;
import com.terragraph.tgalarms.kafka.serdes.AlarmSerde;
import com.terragraph.tgalarms.kafka.serdes.JsonDeserializer;
import com.terragraph.tgalarms.kafka.serdes.JsonSerializer;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.AlarmRule.AlarmRuleOptions;
import com.terragraph.tgalarms.models.Event;
import com.terragraph.tgalarms.models.Event.EventLevel;

import io.grpc.internal.FakeClock;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
class KafkaPipeTest {
	/** The input Kafka topic name. */
	private static final String INPUT_TOPIC = "events";

	/** The output Kafka topic name. */
	private static final String OUTPUT_TOPIC = "alarms";

	/** The alarm service. */
	private AlarmService alarmService;

	/** The test driver. */
	private TopologyTestDriver testDriver;

	/** The alarms store. */
	private KeyValueStore<String, Alarm> alarmStore;

	/** The consumer record factories. */
	private ConsumerRecordFactory<String, Event> eventFactory =
		new ConsumerRecordFactory<>(INPUT_TOPIC, new StringSerializer(), new JsonSerializer<Event>());

	/** Deserializers. */
	private StringDeserializer stringDeserializer = new StringDeserializer();
	private JsonDeserializer<Alarm> alarmDeserializer = new JsonDeserializer<>(Alarm.class);

	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);
	}

	@AfterEach
	void tearDown() {
		if (testDriver != null) {
			testDriver.close();
			testDriver = null;
		}
	}

	/** Initialize test driver using the provided alarm service instance. */
	private void initDriver(AlarmService service) {
		// Create alarm service
		alarmService = service;

		// Create State Store builder
		final String storeName = "alarm-store";
		StoreBuilder<KeyValueStore<String, Alarm>> alarmStoreBuilder = Stores.keyValueStoreBuilder(
			Stores.inMemoryKeyValueStore(storeName), Serdes.String(), new AlarmSerde()
		).withLoggingDisabled();

		// Build topology
		Topology topology = KafkaPipe.buildTopology(
			INPUT_TOPIC,
			OUTPUT_TOPIC,
			() -> new KafkaAlarmProcessor(alarmService, KafkaPipe.ALARM_STORE_NAME, Duration.ofMillis(1)),
			alarmStoreBuilder
		);

		// Set stream properties
		Properties props = new Properties();
		props.put(StreamsConfig.APPLICATION_ID_CONFIG, KafkaPipe.APPLICATION_ID);
		props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "unit_test");

		// Create test driver
		testDriver = new TopologyTestDriver(topology, props);

		// Get alarm store reference
		alarmStore = testDriver.getKeyValueStore(KafkaPipe.ALARM_STORE_NAME);
	}

	/** Read an alarm from the output topic. Returns null if no records are present. */
	private Alarm readOutputAlarm() {
		ProducerRecord<String, Alarm> outputRecord =
			testDriver.readOutput(OUTPUT_TOPIC, stringDeserializer, alarmDeserializer);
		return outputRecord == null ? null : outputRecord.value();
	}

	@Test
	@Order(1)
	void testBasicKafkaPipe() {
		initDriver(new AlarmService());
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity1 = "00:00:00:00:00:01-00:00:00:00:00:02";

		// Add an alarm rule
		AlarmRule rule = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		alarmService.addAlarmRule(rule);

		// Pipe ERROR event
		Event entity1ErrorEvent = new Event(eventId, entity1, EventLevel.ERROR);
		testDriver.pipeInput(eventFactory.create(entity1ErrorEvent));

		// Expect alarm raised
		Alarm alarm1 = readOutputAlarm();
		assertNotNull(alarm1);
		assertTrue(alarm1.isActive());
		assertNull(readOutputAlarm());

		// Expect 1 alarm in store
		assertEquals(1, alarmStore.approximateNumEntries());
		assertNotNull(alarmStore.get(alarm1.getId()));

		// Pipe INFO event
		Event entity1InfoEvent = new Event(eventId, entity1, EventLevel.INFO);
		testDriver.pipeInput(eventFactory.create(entity1InfoEvent));

		// Expect alarm cleared
		Alarm alarm2 = readOutputAlarm();
		assertNotNull(alarm2);
		assertFalse(alarm2.isActive());
		assertNull(readOutputAlarm());

		// Expect 0 alarms in store
		assertEquals(0, alarmStore.approximateNumEntries());
	}

	@Test
	@Order(2)
	public void testInitialLoadFromAlarmStore() {
		initDriver(new AlarmService());
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity1 = "00:00:00:00:00:01-00:00:00:00:00:02";
		final String entity2 = "ff:ff:ff:ff:ff:01-ff:ff:ff:ff:ff:02";

		// Add an alarm rule
		AlarmRule rule = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		alarmService.addAlarmRule(rule);

		// Populate store
		Alarm alarm1 = new Alarm(rule.getName(), rule.getSeverity(), entity1);
		Alarm alarm2 = new Alarm(rule.getName(), rule.getSeverity(), entity2);
		alarmStore.put(alarm1.getId(), alarm1);
		alarmStore.put(alarm2.getId(), alarm2);

		// Load alarms from store
		KafkaPipe.loadInitialAlarms(alarmService, alarmStore);

		// Expect alarms loaded
		assertEquals(2, alarmService.getAlarms().size());
	}

	@Test
	@Order(3)
	public void testDelayedActions() {
		FakeClock fakeClock = new FakeClock();
		initDriver(new AlarmService(fakeClock.getScheduledExecutorService()));
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity = "00:00:00:00:00:01-00:00:00:00:00:02";

		// Add an alarm rule
		final int raiseDelay = 3;
		final int clearDelay = 2;
		AlarmRule rule = new AlarmRule(
			"alarm-LINK",
			"Link status alarm",
			eventId,
			AlarmSeverity.MINOR,
			new AlarmRuleOptions.Builder()
				.setRaiseDelay(raiseDelay)
				.setClearDelay(clearDelay)
				.build()
		);
		alarmService.addAlarmRule(rule);

		// Pipe ERROR event
		Event errorEvent = new Event(eventId, entity, EventLevel.ERROR);
		testDriver.pipeInput(eventFactory.create(errorEvent));

		// Tick 1 second (total 1 of 3)
		fakeClock.forwardTime(1, TimeUnit.SECONDS);
		testDriver.advanceWallClockTime(1);

		// Expect no actions yet (RAISE pending)
		assertNull(readOutputAlarm());
		assertEquals(0, alarmStore.approximateNumEntries());

		// Tick 2 seconds (total 3 of 3)
		fakeClock.forwardTime(2, TimeUnit.SECONDS);
		testDriver.advanceWallClockTime(1);

		// Expect 1 alarm generated
		Alarm alarm1 = readOutputAlarm();
		assertNotNull(alarm1);
		assertTrue(alarm1.isActive());
		assertNull(readOutputAlarm());
		assertEquals(1, alarmStore.approximateNumEntries());
		assertNotNull(alarmStore.get(alarm1.getId()));

		// Pipe INFO event
		Event infoEvent = new Event(eventId, entity, EventLevel.INFO);
		testDriver.pipeInput(eventFactory.create(infoEvent));

		// Tick 1 second (total 1 of 2)
		fakeClock.forwardTime(1, TimeUnit.SECONDS);
		testDriver.advanceWallClockTime(1);

		// Expect no actions yet (CLEAR pending)
		assertNull(readOutputAlarm());
		assertEquals(1, alarmStore.approximateNumEntries());

		// Tick 2 seconds (total 2 of 2)
		fakeClock.forwardTime(1, TimeUnit.SECONDS);
		testDriver.advanceWallClockTime(1);

		// Expect 1 alarm generated
		Alarm alarm2 = readOutputAlarm();
		assertNotNull(alarm2);
		assertFalse(alarm2.isActive());
		assertNull(readOutputAlarm());
		assertEquals(0, alarmStore.approximateNumEntries());
	}
}
