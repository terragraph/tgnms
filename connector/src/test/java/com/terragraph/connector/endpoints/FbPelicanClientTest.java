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
import java.util.Arrays;

import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;

import com.terragraph.connector.DefaultTestWatcher;
import com.terragraph.connector.endpoints.FbPelicanClient;
import com.terragraph.connector.models.AggrStat;
import com.terragraph.connector.models.Config;

@TestMethodOrder(OrderAnnotation.class)
@ExtendWith(DefaultTestWatcher.class)
public class FbPelicanClientTest {
	@BeforeEach
	void setup(TestInfo testInfo) {
		DefaultTestWatcher.printTestName(testInfo);
	}

	@Test
	@Order(1)
	void testSubmitSuccess() {
		// Initialize client
		Config config = Config.createDefaultConfig();
		FbPelicanClient client = new FbPelicanClient(config.pelicanParams) {
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
		AggrStat stat = new AggrStat("test.key", 1559249434L, 1.1, true, "entity");
		client.enqueue(stat);
		assertTrue(client.submit());
		assertEquals(0, client.queueSize());
	}

	@Test
	@Order(2)
	void testWhitelistBlackList() {
		// Initialize client
		Config config = Config.createDefaultConfig();
		FbPelicanClient client = new FbPelicanClient(config.pelicanParams);

		AggrStat stat = new AggrStat("", 1559249434L, 1.1, true, "entity");

		// Test whitelist
		client.setWhitelist(Arrays.asList("[0-9]+"));
		stat.key = "12345abcdef";
		client.enqueue(stat);
		assertEquals(0, client.queueSize());
		stat.key = "12345";
		client.enqueue(stat);
		assertEquals(1, client.queueSize());
		client.setWhitelist(null);

		// Test blacklist
		stat.key = "12345abcdef";
		client.setBlacklist(Arrays.asList("[a-z]+"));
		client.enqueue(stat);
		assertEquals(2, client.queueSize());
		stat.key = "abcdef";
		client.enqueue(stat);
		assertEquals(2, client.queueSize());
		client.setBlacklist(null);
	}
}
