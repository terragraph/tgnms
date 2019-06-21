/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.tg;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.stream.Collectors;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.connector.endpoints.HttpUtils;
import com.terragraph.connector.models.TopologyConfig;

/**
 * Utility for fetching Terragraph topologies.
 */
public class TgTopologyFetcher {
	private static final Logger logger = LoggerFactory.getLogger(TgTopologyFetcher.class);

	/** Fetch and update all given topology structures, ignoring any failures. */
	public static void updateTopologies(List<TopologyConfig> configs) {
		logger.debug(
			"Fetching {} topologies: {}",
			configs.size(),
			String.join(", ", configs.stream().map(c -> c.name).collect(Collectors.toList()))
		);
		for (TopologyConfig config : configs) {
			try {
				TgTopologyFetcher.updateTopology(config);
			} catch (IOException e) {
				logger.debug("Failed to fetch topology for \"{}\": {}", config.name, e.getMessage());
			}
		}
	}

	/** Fetch and update the given topology config structure. */
	public static void updateTopology(TopologyConfig config) throws IOException {
		URL url = getApiUrl(config.primary_controller.ip, config.primary_controller.api_port, "getTopology");
		String postData = "{}";
		String ret = HttpUtils.sendPostRequest(url, postData, "application/json");
		config.topology = new JSONObject(ret);
	}

	/** Return the Terragraph API service URL for the given IP/port and API method. */
	private static URL getApiUrl(String ip, int port, String method) throws MalformedURLException {
		String host = HttpUtils.isIPv6Address(ip) ? String.format("[%s]", ip) : ip;
		return new URL(String.format("http://%s:%d/api/%s", host, port, method));
	}
}
