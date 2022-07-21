/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.terragraph.tgalarms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.terragraph.tgalarms.AlarmService.AlarmAction;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.AlarmRule.AlarmRuleOptions;
import com.terragraph.tgalarms.models.Event;
import com.terragraph.tgalarms.models.Event.EventLevel;

import io.grpc.internal.FakeClock;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
class AlarmServiceTest {
	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);
	}

	@Test
	@Order(1)
	void testBasicAlarmRules() throws Exception {
		AlarmService service = new AlarmService();
		final int eventId = Event.EventId.LINK_STATUS.getId();

		// Add an alarm rule
		AlarmRule rule = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		boolean ruleAdded = service.addAlarmRule(rule);
		assertTrue(ruleAdded);

		// Retrieve alarm rules and compare
		Collection<AlarmRule> rules = service.getAlarmRules();
		assertEquals(1, rules.size());
		assertEquals(rule, rules.iterator().next());
		assertEquals(rule, service.getAlarmRule(rule.getName()));

		// Retrieve bogus alarm rule (should fail)
		assertEquals(null, service.getAlarmRule("blah"));

		// Try to add the same alarm again (should fail)
		ruleAdded = service.addAlarmRule(rule);
		assertFalse(ruleAdded);
		assertEquals(1, rules.size());

		// Add rule on the same event, but with a different name (should succeed)
		AlarmRule rule2 = new AlarmRule("alarm-LINK-RULE-2", "Link status alarm", eventId, AlarmSeverity.MINOR);
		ruleAdded = service.addAlarmRule(rule2);
		assertTrue(ruleAdded);
		assertEquals(2, rules.size());
	}

	@Test
	@Order(2)
	void testSaveLoadAlarmRules() throws Exception {
		// Create temporary file
		File f = Files.createTempFile(null, ".json").toFile();
		f.deleteOnExit();

		// Add rules to a service instance and save
		AlarmService service1 = new AlarmService();
		service1.setAlarmRulesFile(f);
		service1.addAlarmRule(
			new AlarmRule("alarm-LINK", "Link status alarm", Event.EventId.LINK_STATUS.getId(), AlarmSeverity.MINOR)
		);
		service1.addAlarmRule(
			new AlarmRule("alarm-NODE", "Node status alarm", Event.EventId.NODE_STATUS.getId(), AlarmSeverity.MAJOR)
		);

		// Load rules in another service instance
		AlarmService service2 = new AlarmService();
		service2.setAlarmRulesFile(f);
		service2.loadAlarmRules();

		// Check equality
		Collection<AlarmRule> rules1 = service1.getAlarmRules();
		Collection<AlarmRule> rules2 = service2.getAlarmRules();
		assertTrue(rules1.containsAll(rules2) && rules2.containsAll(rules1));
	}

	@Test
	@Order(3)
	void testDeleteAlarmRules() throws Exception {
		AlarmService service = new AlarmService();
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity = "00:00:00:00:00:01-00:00:00:00:00:02";

		// Add an alarm rule
		AlarmRule rule1 = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		service.addAlarmRule(rule1);
		assertEquals(1, service.getAlarmRules().size());

		// Add a listener
		Map<String, AlarmAction> alarmActions = new HashMap<>();
		service.addAlarmListener((alarm, action) -> alarmActions.put(alarm.getId(), action));

		// Send an ERROR event (generates an alarm)
		Event errorEvent = new Event(eventId, entity, EventLevel.ERROR);
		service.processEvent(errorEvent);
		assertEquals(1, service.getAlarms().size());

		// Delete the alarm rule (should also delete the alarm)
		boolean alarmRuleDeleted = service.deleteAlarmRule(rule1.getName());
		assertTrue(alarmRuleDeleted);
		assertEquals(0, service.getAlarmRules().size());
		assertEquals(0, service.getAlarms().size());
		assertEquals(1, alarmActions.values().stream().filter(status -> status == AlarmAction.RULE_DELETED).count());

		// Add an alarm rule with raise/clear delays
		final int raiseDelay = 3;
		final int clearDelay = 2;
		AlarmRule rule2 = new AlarmRule(
			"alarm-LINK",
			"Link status alarm",
			eventId,
			AlarmSeverity.MINOR,
			new AlarmRuleOptions.Builder()
				.setRaiseDelay(raiseDelay)
				.setClearDelay(clearDelay)
				.build()
		);
		service.addAlarmRule(rule2);

		// Send an ERROR event (generates pending alarm)
		service.processEvent(errorEvent);
		assertEquals(0, service.getAlarms().size());

		// Delete the alarm rule (should also delete the pending alarm)
		alarmRuleDeleted = service.deleteAlarmRule(rule2.getName());
		assertTrue(alarmRuleDeleted);
		assertEquals(0, service.getAlarmRules().size());
		assertEquals(0, service.getAlarms().size());
	}

	@Test
	@Order(4)
	void testDefaultAlarmRules() throws Exception {
		// Check that all the default alarm rules don't crash
		AlarmService service = new AlarmService();
		Arrays.stream(DefaultAlarmRules.get()).forEach(rule -> service.addAlarmRule(rule));
	}

	@Test
	@Order(101)
	void testBasicAlarms() throws Exception {
		AlarmService service = new AlarmService();
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity1 = "00:00:00:00:00:01-00:00:00:00:00:02";
		final String entity2 = "ff:ff:ff:ff:ff:01-ff:ff:ff:ff:ff:02";

		// Add an alarm rule
		AlarmRule rule = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		service.addAlarmRule(rule);

		// Add a listener
		Map<String, Alarm> alarms = new HashMap<>();
		service.addAlarmListener((alarm, action) -> alarms.put(alarm.getId(), alarm));

		// Send an INFO event on entity1 (nothing happens)
		service.processEvent(new Event(eventId, entity1, EventLevel.INFO));
		assertTrue(service.getAlarms().isEmpty());

		// Send an ERROR event on entity1 (generates an alarm)
		Event entity1ErrorEvent = new Event(eventId, entity1, EventLevel.ERROR);
		service.processEvent(entity1ErrorEvent);
		assertEquals(1, service.getAlarms().size());
		Optional<Alarm> alarm1 =
			service.getAlarms().stream().filter(alarm -> alarm.getEntity().equals(entity1)).findFirst();
		assertTrue(alarm1.isPresent());
		assertEquals(rule.getSeverity(), alarm1.get().getSeverity());
		assertEquals(1, alarm1.get().getEvents().size());
		assertEquals(entity1ErrorEvent, alarm1.get().getEvents().get(0));

		// Send another ERROR event on entity1 (adds event to existing alarm)
		service.processEvent(entity1ErrorEvent);
		assertEquals(1, service.getAlarms().size());
		assertEquals(2, alarm1.get().getEvents().size());

		// Send an ERROR event on entity2 (generates an alarm)
		service.processEvent(new Event(eventId, entity2, EventLevel.ERROR));
		assertEquals(2, service.getAlarms().size());
		Optional<Alarm> alarm2 =
			service.getAlarms().stream().filter(alarm -> alarm.getEntity().equals(entity2)).findFirst();
		assertTrue(alarm2.isPresent());
		assertEquals(rule.getSeverity(), alarm2.get().getSeverity());

		// Send an INFO event on entity2 (clears the alarm)
		service.processEvent(new Event(eventId, entity2, EventLevel.INFO));
		assertEquals(1, service.getAlarms().size());
		assertEquals(0, service.getAlarms().stream().filter(alarm -> alarm.getEntity().equals(entity2)).count());
	}

	@Test
	@Order(102)
	void testBasicAlarmRuleOptions() throws Exception {
		AlarmService service = new AlarmService();
		final int eventId = Event.EventId.NODE_STATUS.getId();
		final String entity1 = "test.p1";
		final String entity2 = "test.p2";

		// Add an alarm rule
		Map<String, Object> eventFilter = new HashMap<>();
		eventFilter.put("entity", entity1);
		AlarmRule rule = new AlarmRule(
			"alarm-NODE",
			"Node status alarm",
			eventId,
			AlarmSeverity.MAJOR,
			new AlarmRuleOptions.Builder()
				.setRaiseOnLevel(new HashSet<>(Arrays.asList(EventLevel.FATAL)))
				.setClearOnLevel(new HashSet<>(Arrays.asList(EventLevel.INFO, EventLevel.WARNING)))
				.setEventFilter(new HashSet<>(Arrays.asList(eventFilter)))
				.build()
		);
		service.addAlarmRule(rule);

		// Send an ERROR event on entity1 (nothing happens - not in raiseOnLevel)
		service.processEvent(new Event(eventId, entity1, EventLevel.ERROR));
		assertTrue(service.getAlarms().isEmpty());

		// Send a FATAL event on entity1 (generates an alarm - in raiseOnLevel)
		service.processEvent(new Event(eventId, entity1, EventLevel.FATAL));
		assertEquals(1, service.getAlarms().size());

		// Send a WARNING event on entity1 (clears the alarm - in clearOnLevel)
		service.processEvent(new Event(eventId, entity1, EventLevel.WARNING));
		assertTrue(service.getAlarms().isEmpty());

		// Send a FATAL event on entity2 (nothing happens - not in entityFilter)
		service.processEvent(new Event(eventId, entity2, EventLevel.FATAL));
		assertTrue(service.getAlarms().isEmpty());
	}

	@Test
	@Order(103)
	void testFilters() throws Exception {
		AlarmService service = new AlarmService();
		final int eventId = Event.EventId.NODE_STATUS.getId();
		final String entityCN = "cn";
		final String entityDN = "dn";
		final String topology1 = "topology1";
		final String topology2 = "topology2";

		// Add an alarm rule on CN nodes only
		Map<String, Object> eventFilter = new HashMap<>();
		Map<String, Object> attributeFilter = new HashMap<>();
		eventFilter.put("topologyName", topology1);
		attributeFilter.put("/node_type", "CN");
		AlarmRule rule = new AlarmRule(
			"alarm-NODE-CN",
			"CN status alarm",
			eventId,
			AlarmSeverity.CRITICAL,
			new AlarmRuleOptions.Builder()
				.setEventFilter(new HashSet<>(Arrays.asList(eventFilter)))
				.setAttributeFilter(new HashSet<>(Arrays.asList(attributeFilter)))
				.build()
		);
		service.addAlarmRule(rule);

		// Send an ERROR event (nothing happens - attribute doesn't match)
		Event eventDN = new Event(eventId, entityDN, EventLevel.ERROR);
		eventDN.topologyName = topology1;
		eventDN.details = "{\"name\":\"dn\",\"status\":\"OFFLINE\",\"node_type\":\"DN\"}";
		service.processEvent(eventDN);
		assertTrue(service.getAlarms().isEmpty());

		// Send an ERROR event (nothing happens - no attribute)
		Event eventEmptyDetails = new Event(eventId, entityCN, EventLevel.ERROR);
		eventEmptyDetails.details = "{}";
		service.processEvent(eventEmptyDetails);
		assertTrue(service.getAlarms().isEmpty());

		// Send an ERROR event (nothing happens - malformed details)
		Event eventMalformed = new Event(eventId, entityCN, EventLevel.ERROR);
		eventMalformed.details = "{asdf}";
		service.processEvent(eventMalformed);
		assertTrue(service.getAlarms().isEmpty());

		// Send an ERROR event (nothing happens - no topology name)
		Event eventCN = new Event(eventId, entityCN, EventLevel.ERROR);
		eventCN.details = "{\"name\":\"cn\",\"status\":\"OFFLINE\",\"node_type\":\"CN\"}";
		service.processEvent(eventCN);
		assertTrue(service.getAlarms().isEmpty());

		// Send an ERROR event (nothing happens - topology doesn't match)
		eventCN.topologyName = topology2;
		service.processEvent(eventCN);
		assertTrue(service.getAlarms().isEmpty());

		// Send an ERROR event (generates an alarm - attribute matches)
		eventCN.topologyName = topology1;
		service.processEvent(eventCN);
		assertEquals(1, service.getAlarms().size());
	}

	@Test
	@Order(104)
	void testAggregationAlarms() throws Exception {
		AlarmService service = new AlarmService();
		final int eventId = Event.EventId.NODE_STATUS.getId();
		final String entity1 = "test.p1";
		final String entity2 = "test.p2";
		final String entity3 = "test.p3";

		// Add an alarm rule on 3x NODE_STATUS entities
		final int aggregationCount = 3;
		AlarmRule rule = new AlarmRule(
			"alarm-NODES-DOWN-3",
			"3 nodes offline",
			eventId,
			AlarmSeverity.CRITICAL,
			new AlarmRuleOptions.Builder()
				.setAggregation(aggregationCount)
				.build()
		);
		service.addAlarmRule(rule);

		// Send "node down" on 2 entities
		service.processEvent(new Event(eventId, entity1, EventLevel.ERROR));
		service.processEvent(new Event(eventId, entity2, EventLevel.ERROR));
		assertEquals(2, service.getAlarms().stream().filter(Alarm::isHidden).count());

		// Send "node up" on 1 entity
		service.processEvent(new Event(eventId, entity2, EventLevel.INFO));
		assertEquals(1, service.getAlarms().stream().filter(Alarm::isHidden).count());

		// Send "node down" for all 3 entities (expect raise aggregation alarm)
		service.processEvent(new Event(eventId, entity1, EventLevel.ERROR));
		service.processEvent(new Event(eventId, entity2, EventLevel.ERROR));
		service.processEvent(new Event(eventId, entity3, EventLevel.ERROR));
		assertEquals(3, service.getAlarms().stream().filter(Alarm::isHidden).count());
		assertEquals(1, service.getAlarms().stream().filter(Alarm::isAggregation).count());

		// Send "node up" on 1 entity (expect clear aggregation alarm)
		service.processEvent(new Event(eventId, entity3, EventLevel.INFO));
		assertEquals(2, service.getAlarms().stream().filter(Alarm::isHidden).count());
		assertEquals(0, service.getAlarms().stream().filter(Alarm::isAggregation).count());

		// Send "node down" again (expect raise aggregation alarm)
		service.processEvent(new Event(eventId, entity3, EventLevel.ERROR));
		assertEquals(3, service.getAlarms().stream().filter(Alarm::isHidden).count());
		assertEquals(1, service.getAlarms().stream().filter(Alarm::isAggregation).count());
	}

	@Test
	@Order(105)
	void testRaiseClearDelay() throws Exception {
		FakeClock fakeClock = new FakeClock();
		ScheduledExecutorService scheduledExecutorService = fakeClock.getScheduledExecutorService();
		AlarmService service = new AlarmService(scheduledExecutorService);
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity = "00:00:00:00:00:01-00:00:00:00:00:02";

		// Add an alarm rule that raises/clears with a delay
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
		service.addAlarmRule(rule);

		// Send an ERROR event (should generate pending RAISE)
		service.processEvent(new Event(eventId, entity, EventLevel.ERROR));
		assertEquals(0, service.getAlarms().size());
		assertEquals(1, fakeClock.getPendingTasks().size());
		assertEquals(0, fakeClock.getDueTasks().size());

		// Tick 1 second (total 1 of 3)
		int tasksRun = fakeClock.forwardTime(1, TimeUnit.SECONDS);
		assertEquals(0, tasksRun);

		// Send another ERROR event (should do nothing)
		service.processEvent(new Event(eventId, entity, EventLevel.ERROR));
		assertEquals(1, fakeClock.getPendingTasks().size());

		// Tick 2 seconds (total 3 of 3)
		// Check that the alarm is generated
		tasksRun = fakeClock.forwardTime(2, TimeUnit.SECONDS);
		assertEquals(1, tasksRun);
		assertEquals(1, service.getAlarms().size());

		// Send an INFO event (should generate pending CLEAR)
		service.processEvent(new Event(eventId, entity, EventLevel.INFO));
		assertEquals(1, service.getAlarms().size());
		assertEquals(1, fakeClock.getPendingTasks().size());
		assertEquals(0, fakeClock.getDueTasks().size());

		// Tick 1 second (total 1 of 2)
		tasksRun = fakeClock.forwardTime(1, TimeUnit.SECONDS);
		assertEquals(0, tasksRun);

		// Send an ERROR event (should cancel pending CLEAR)
		service.processEvent(new Event(eventId, entity, EventLevel.ERROR));
		assertEquals(1, service.getAlarms().size());
		assertEquals(0, fakeClock.getPendingTasks().size());

		// Send an INFO event (should generate pending CLEAR)
		service.processEvent(new Event(eventId, entity, EventLevel.INFO));
		assertEquals(1, service.getAlarms().size());
		assertEquals(1, fakeClock.getPendingTasks().size());
		assertEquals(0, fakeClock.getDueTasks().size());

		// Tick 2 seconds (total 2 of 2)
		// Check that the alarm is cleared
		tasksRun = fakeClock.forwardTime(2, TimeUnit.SECONDS);
		assertEquals(1, tasksRun);
		assertEquals(0, service.getAlarms().size());
	}
}
