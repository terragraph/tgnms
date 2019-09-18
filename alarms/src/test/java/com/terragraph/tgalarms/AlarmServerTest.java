/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.google.gson.Gson;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.Event;

import kong.unirest.HttpResponse;
import kong.unirest.JsonNode;
import kong.unirest.Unirest;
import spark.Spark;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
public class AlarmServerTest {
	/** The test server port. */
	private static final int TEST_PORT = spark.Service.SPARK_DEFAULT_PORT;

	/** Test alarm service instance. */
	private AlarmService service;

	/** Test Spark server instance. */
	private AlarmServer server;

	/** Build an endpoint URL. */
	private String endpoint(String path) {
		return String.format("http://localhost:%d%s", TEST_PORT, path);
	}

	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);

		// Instantiate AlarmService and AlarmServer
		service = new AlarmService();
		try {
			server = new AlarmServer(service, TEST_PORT);
			server.start();
			Spark.awaitInitialization();
		} catch (Exception e) {
			fail("Could not instantiate AlarmServer.", e);
		}
	}

	@AfterEach
	void tearDown() {
		// Destroy AlarmService and AlarmServer
		if (server != null) {
			server.stop();
			Spark.awaitStop();
		}
		service = null;
		server = null;

		// Reset Unirest client
		// Without this, Unirest randomly throws:
		// kong.unirest.UnirestException: java.net.SocketException: Software caused connection abort: recv failed
		Unirest.shutDown();
	}

	@Test
	@Order(1)
	void testAlarmRuleEndpoints() throws Exception {
		HttpResponse<String> strResp;
		HttpResponse<JsonNode> jsonResp;

		// Query initial rules (empty)
		jsonResp = Unirest.get(endpoint("/rules")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertEquals(0, jsonResp.getBody().getArray().length());

		// Add a rule
		AlarmRule rule = new AlarmRule("alarm-TEST", "Test rule", 1, AlarmSeverity.CRITICAL);
		strResp = Unirest.post(endpoint("/add_rule")).body(new Gson().toJson(rule)).asString();
		assertTrue(strResp.isSuccess());

		// Query rules (1 rule)
		jsonResp = Unirest.get(endpoint("/rules")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertEquals(1, jsonResp.getBody().getArray().length());

		// Delete the rule
		strResp = Unirest.post(endpoint("/del_rule")).field("name", rule.getName()).asString();
		assertTrue(strResp.isSuccess());

		// Query rules (empty)
		jsonResp = Unirest.get(endpoint("/rules")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertEquals(0, jsonResp.getBody().getArray().length());
	}

	@Test
	@Order(2)
	void testInitialAlarmRuleEndpoints() throws Exception {
		HttpResponse<JsonNode> jsonResp;

		// Create temporary file
		File f = Files.createTempFile(null, ".json").toFile();
		f.delete();

		// Load default alarm rules (temporary file is created)
		service.setAlarmRulesFile(f);
		service.loadAlarmRules();
		assertTrue(f.isFile());
		f.deleteOnExit();

		// Query default rules
		jsonResp = Unirest.get(endpoint("/rules")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertFalse(jsonResp.getBody().getArray().isEmpty());
		int length1 = jsonResp.getBody().getArray().length();

		// Load rules from file
		service.loadAlarmRules();

		// Query rules again
		jsonResp = Unirest.get(endpoint("/rules")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertFalse(jsonResp.getBody().getArray().isEmpty());
		int length2 = jsonResp.getBody().getArray().length();

		assertEquals(length1, length2);
	}

	@Test
	@Order(3)
	void testAlarmEndpoints() throws Exception {
		HttpResponse<JsonNode> jsonResp;

		// Query initial alarms (empty)
		jsonResp = Unirest.get(endpoint("/alarms")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertEquals(0, jsonResp.getBody().getArray().length());

		// Add an alarm rule and two alarms
		final int eventId = Event.EventId.LINK_STATUS.getId();
		final String entity1 = "00:00:00:00:00:01-00:00:00:00:00:02";
		final String entity2 = "ff:ff:ff:ff:ff:01-ff:ff:ff:ff:ff:02";
		AlarmRule rule = new AlarmRule("alarm-LINK", "Link status alarm", eventId, AlarmSeverity.MINOR);
		List<Alarm> alarms = new ArrayList<>();
		alarms.add(new Alarm(rule.getName(), rule.getSeverity(), entity1));
		alarms.add(new Alarm(rule.getName(), rule.getSeverity(), entity2));
		assertTrue(service.addAlarmRule(rule));
		service.loadAlarms(alarms);

		// Query alarms
		jsonResp = Unirest.get(endpoint("/alarms")).asJson();
		assertTrue(jsonResp.isSuccess());
		assertTrue(jsonResp.getBody().isArray());
		assertEquals(2, jsonResp.getBody().getArray().length());
	}

	@Test
	@Order(100)
	void testFailureCases() throws Exception {
		// Add a rule
		AlarmRule rule = new AlarmRule("alarm-TEST", "Test rule", 1, AlarmSeverity.CRITICAL);
		assertTrue(Unirest.post(endpoint("/add_rule")).body(new Gson().toJson(rule)).asString().isSuccess());

		// Add the same rule (should fail)
		assertFalse(Unirest.post(endpoint("/add_rule")).body(new Gson().toJson(rule)).asString().isSuccess());

		// Add rules with bad data (should fail)
		assertFalse(Unirest.post(endpoint("/add_rule")).body("blah").asString().isSuccess());
		assertFalse(Unirest.post(endpoint("/add_rule")).body("{}").asString().isSuccess());
		assertFalse(Unirest.post(endpoint("/add_rule")).body("{\"blah\":\"blah\"}").asString().isSuccess());

		// Delete non-existent rule (should fail)
		assertFalse(Unirest.post(endpoint("/del_rule")).field("name", "blah").asString().isSuccess());

		// Delete rules with bad data (should fail)
		assertFalse(Unirest.post(endpoint("/del_rule")).asString().isSuccess());
		assertFalse(Unirest.post(endpoint("/del_rule")).field("blah", "blah").asString().isSuccess());
		assertFalse(Unirest.post(endpoint("/del_rule")).body("blah").asString().isSuccess());
	}

	@Test
	@Order(101)
	void test404() throws Exception {
		final String bogusEndpoint = endpoint("/so_test_such_wow");

		assertEquals(404, Unirest.get(bogusEndpoint).asString().getStatus());
		assertEquals(404, Unirest.post(bogusEndpoint).asString().getStatus());
		assertEquals(404, Unirest.put(bogusEndpoint).asString().getStatus());
		assertEquals(404, Unirest.delete(bogusEndpoint).asString().getStatus());
		assertEquals(404, Unirest.options(bogusEndpoint).asString().getStatus());
		assertEquals(404, Unirest.head(bogusEndpoint).asString().getStatus());
		assertEquals(404, Unirest.patch(bogusEndpoint).asString().getStatus());
	}
}
