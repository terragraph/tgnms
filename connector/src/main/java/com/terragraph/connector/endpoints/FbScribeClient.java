/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import java.io.IOException;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.terragraph.connector.endpoints.FbScribeClient.FbScribeEvent;
import com.terragraph.connector.models.Config.ScribeParams;
import com.terragraph.connector.models.Event;

/**
 * Scribe client for pushing events.
 */
public class FbScribeClient extends ClientBase<Event, FbScribeEvent> {
	private static final Logger logger = LoggerFactory.getLogger(FbScribeClient.class);

	/** The event category. */
	private static final String EVENT_CATEGORY = "TG";

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The client configuration. */
	private final ScribeParams config;

	/** Scribe event. */
	public class FbScribeEvent {
		public String category;
		public String message;

		/** Constructor. */
		public FbScribeEvent(String category, String message) {
			this.category = category;
			this.message = message;
		}
	}

	/** Constructor. */
	public FbScribeClient(ScribeParams config) {
		super(config.minBatchSize, config.maxQueueIntervalMs);
		this.config = config;
	}

	@Override
	public boolean shouldSubmit() {
		return config.enabled && super.shouldSubmit();
	}

	@Override
	protected FbScribeEvent translate(Event entry) {
		return new FbScribeEvent(EVENT_CATEGORY, gson.toJson(entry));
	}

	@Override
	protected boolean submit(List<FbScribeEvent> queue) {
		logger.info("Submitting {} event(s) to Scribe...", queue.size());
		logger.debug("1st event: {}", gson.toJson(queue.get(0)));

		// Add POST parameters
		Map<String, Object> postData = new HashMap<>();
		postData.put("access_token", config.accessToken);
		postData.put("logs", gson.toJson(queue));

		try {
			// Send request
			String ret = sendPostRequest(
				new URL(config.remoteEndpoint),
				HttpUtils.formEncode(postData),
				"application/x-www-form-urlencoded"
			);

			// Handle response
			JSONObject resp = new JSONObject(ret);
			if (resp.has("count")) {
				int count = resp.getInt("count");
				if (count == queue.size()) {
					logger.info("Successfully submitted {} event(s) to Scribe.", count);
				} else {
					logger.warn("Submitted {} (of {}) event(s) to Scribe.", count, queue.size());
				}
			} else {
				logger.error("Error sending events to Scribe.");
				return false;
			}
		} catch (IOException e) {
			logger.error("Error sending events to Scribe.", e);
			return false;
		}

		return true;
	}
}
