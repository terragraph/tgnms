/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.URL;

import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.terragraph.connector.DefaultTestWatcher;
import com.terragraph.connector.endpoints.FbScribeClient;
import com.terragraph.connector.models.Config;
import com.terragraph.connector.models.Event;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
public class FbScribeClientTest {
	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);
	}

	@Test
	@Order(1)
	void testSubmitSuccess() {
		// Initialize client
		Config config = Config.createDefaultConfig();
		FbScribeClient client = new FbScribeClient(config.scribeParams) {
			@Override
			protected String sendPostRequest(URL url, String postData, String contentType) throws IOException {
				// Basic sanity checks
				if (url == null || postData == null || postData.isEmpty()) {
					return "";
				}

				// Mock success response
				JSONObject res = new JSONObject();
				res.put("count", queueSize());
				return res.toString();
			}
		};

		// No entries yet - nothing to submit
		assertFalse(client.shouldSubmit());
		assertFalse(client.submit());

		// Add and submit an entry (success)
		Event event = new Event();
		event.timestamp = 1559249434L;
		event.reason = "unit test";
		event.category = 100;
		event.eventId = 101;
		event.level = 10;
		event.entity = event.nodeId = "0:0:0:0:0:1";
		client.enqueue(event);
		assertTrue(client.submit());
		assertEquals(0, client.queueSize());
	}
}
