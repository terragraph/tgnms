/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.prometheus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.terragraph.tgalarms.AlarmService;
import com.terragraph.tgalarms.DefaultTestWatcher;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.Event;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
public class AlertmanagerClientTest {
	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);
	}

	@Test
	@Order(1)
	void testAlertRetrieval() throws Exception {
		AlarmService service = new AlarmService();
		AlertmanagerClient client = new AlertmanagerClient(service, "", 9093);

		// Load an alarm
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity = "00:00:00:00:00:01-00:00:00:00:00:02";
		AlarmRule rule = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		assertTrue(service.addAlarmRule(rule));
		Alarm alarm = new Alarm(rule.getName(), rule.getSeverity(), entity);
		service.loadAlarms(Arrays.asList(alarm));
		assertEquals(1, service.getAlarms().size());

		// Retrieve current alerts
		List<AlertmanagerAlert> alerts = client.getAlerts();
		assertEquals(1, alerts.size());

		// Check for required fields
		AlertmanagerAlert alert = alerts.get(0);
		assertTrue(alert.labels.containsKey("alertname"));
		assertFalse(alert.startsAt.isEmpty());
	}
}
