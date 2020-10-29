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
import com.terragraph.connector.endpoints.FbOdsClient.FbOdsDatapoint;
import com.terragraph.connector.models.AggrStat;
import com.terragraph.connector.models.Config.OdsParams;

/**
 * ODS client for pushing stats.
 */
public class FbOdsClient extends ClientBase<AggrStat, FbOdsDatapoint> {
	private static final Logger logger = LoggerFactory.getLogger(FbOdsClient.class);

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The client configuration. */
	private final OdsParams config;

	/** ODS data point. */
	public class FbOdsDatapoint {
		public String entity;
		public String key;
		public double value;
		public long time;

		/** Constructor. */
		public FbOdsDatapoint(String entity, String key, double value, long time) {
			this.entity = entity;
			this.key = key;
			this.value = value;
			this.time = time;
		}
	}

	/** Constructor. */
	public FbOdsClient(OdsParams config) {
		super(config.minBatchSize, config.maxQueueIntervalMs);
		this.config = config;
	}

	@Override
	public boolean shouldSubmit() {
		return config.enabled && super.shouldSubmit();
	}

	@Override
	protected FbOdsDatapoint translate(AggrStat entry) {
		return new FbOdsDatapoint(
			String.format("%s%s", config.entityPrefix, entry.entity).replace(' ', '_'),
			String.format("%s%s", config.keyPrefix, entry.key).replace(' ', '_'),
			entry.value,
			entry.timestamp
		);
	}

	@Override
	protected boolean submit(List<FbOdsDatapoint> queue) {
		logger.info("Submitting {} data point(s) to ODS...", queue.size());
		logger.debug("1st data point: {}", gson.toJson(queue.get(0)));

		// Add POST parameters
		Map<String, Object> postData = new HashMap<>();
		postData.put("access_token", config.accessToken);
		postData.put("category_id", Integer.toString(config.categoryId));
		postData.put("datapoints", gson.toJson(queue));

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
					logger.info("Successfully submitted {} data point(s) to ODS.", count);
				} else {
					logger.warn("Submitted {} (of {}) data point(s) to ODS.", count, queue.size());
				}
			} else if (resp.has("error")) {
				logger.error("ODS error: {}", resp.getString("error"));
				return false;
			}
		} catch (IOException e) {
			logger.error("Error sending data points to ODS.", e);
			return false;
		}

		return true;
	}
}
