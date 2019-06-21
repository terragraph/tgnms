/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import java.io.IOException;
import java.net.URL;
import java.util.Collection;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.terragraph.connector.endpoints.FbPelicanClient.FbPelicanDatapoint;
import com.terragraph.connector.models.AggrStat;
import com.terragraph.connector.models.Config.PelicanParams;

public class FbPelicanClient extends ClientBase<AggrStat, FbPelicanDatapoint> {
	private static final Logger logger = LoggerFactory.getLogger(FbPelicanClient.class);

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The client configuration. */
	private final PelicanParams config;

	/** The whitelisted stat keys (if any). */
	private List<Pattern> keyWhitelist;

	/** The blacklisted stat keys (if any). */
	private List<Pattern> keyBlacklist;

	/** Pelican data point. */
	public class FbPelicanDatapoint {
		public long timestamp_us;
		public String activity_name;
		public String stream_name;
		public double value;

		/** Constructor. */
		public FbPelicanDatapoint(long timestamp_us, String activity_name, String stream_name, double value) {
			this.timestamp_us = timestamp_us;
			this.activity_name = activity_name;
			this.stream_name = stream_name;
			this.value = value;
		}
	}

	/** Constructor. */
	public FbPelicanClient(PelicanParams config) {
		super(config.minBatchSize, config.maxQueueIntervalMs);
		this.config = config;
	}

	/** Whitelist stat keys using the given list of regular expressions. */
	public void setWhitelist(Collection<String> keyRegexes) {
		this.keyWhitelist = keyRegexes == null
			? null
			: keyRegexes.stream().map(s -> Pattern.compile(s)).collect(Collectors.toList());
	}

	/** Blacklist stat keys using the given list of regular expressions. */
	public void setBlacklist(Collection<String> keyRegexes) {
		this.keyBlacklist = keyRegexes == null
			? null
			: keyRegexes.stream().map(s -> Pattern.compile(s)).collect(Collectors.toList());
	}

	/** Return whether the given key matches any regex in a list. */
	private boolean regexMatches(String key, List<Pattern> regexes) {
		return regexes.stream().anyMatch(regex -> regex.matcher(key).matches());
	}

	@Override
	public synchronized void enqueue(AggrStat entry) {
		if (keyBlacklist != null && regexMatches(entry.key, keyBlacklist)) {
			return;
		}
		if (keyWhitelist != null && !regexMatches(entry.key, keyWhitelist)) {
			return;
		}
		super.enqueue(entry);
	}

	@Override
	public boolean shouldSubmit() {
		return config.enabled && super.shouldSubmit();
	}

	@Override
	protected FbPelicanDatapoint translate(AggrStat entry) {
		return new FbPelicanDatapoint(
			entry.timestamp * 1000000L,
			String.format("terragraph.%s", entry.entity),
			entry.key,
			entry.value
		);
	}

	@Override
	protected boolean submit(List<FbPelicanDatapoint> queue) {
		logger.info("Submitting {} data point(s) to Pelican...", queue.size());
		logger.debug("1st data point: {}", gson.toJson(queue.get(0)));

		// Add POST parameters
		JSONObject postData = new JSONObject();
		postData.put("access_token", config.accessToken);
		postData.put("data", gson.toJson(queue));

		try {
			// Send request
			String ret = sendPostRequest(new URL(config.remoteEndpoint), postData.toString(), "application/json");

			// Handle response
			JSONObject resp = new JSONObject(ret);
			if (resp.has("count")) {
				int count = resp.getInt("count");
				if (count == queue.size()) {
					logger.info("Successfully submitted {} data point(s) to Pelican.", count);
				} else {
					logger.warn("Submitted {} (of {}) data point(s) to Pelican.", count, queue.size());
				}
			}
		} catch (IOException e) {
			logger.error("Error sending data points to Pelican.", e);
			return false;
		}

		return true;
	}
}
