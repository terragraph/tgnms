/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.terragraph.connector.models.Config.MySqlParams;
import com.terragraph.connector.models.Event;
import com.terragraph.connector.models.TopologyConfig;
import com.terragraph.connector.tg.TgMySqlManager;
import com.terragraph.connector.tg.TgTopologyFetcher;

/**
 * MySQL client for pushing events.
 */
public class MySqlEventClient extends ClientBase<Event, Event> {
	private static final Logger logger = LoggerFactory.getLogger(MySqlEventClient.class);

	/** The MySQL manager instance. */
	private TgMySqlManager sqlManager;

	/** The map from node ID to MySQL topology name. */
	private Map<String, String> macToTopologyMap;

	/** The map from reported topology name to MySQL topology name. */
	private Map<String, String> topologyNameMap;

	/** The thread executor for the topology fetcher. */
	private final ScheduledExecutorService executor;

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The client configuration. */
	private final MySqlParams config;

	/** The interval (in seconds) for fetching all topologies. */
	private final int topologyFetchIntervalSec;

	/** Constructor. */
	public MySqlEventClient(MySqlParams config, int topologyFetchIntervalSec)
		throws InstantiationException, IllegalAccessException, ClassNotFoundException, SQLException {
		super(config.minBatchSize, config.maxQueueIntervalMs);
		this.config = config;
		this.topologyFetchIntervalSec = topologyFetchIntervalSec;
		this.executor = Executors.newSingleThreadScheduledExecutor(r -> new Thread(r, this.getClass().getSimpleName()));
	}

	@Override
	public boolean shouldSubmit() {
		return config.enabled && super.shouldSubmit();
	}

	@Override
	protected Event translate(Event entry) {
		return entry;
	}

	@Override
	protected synchronized boolean submit(List<Event> queue) {
		logger.info("Writing {} event(s) to MySQL...", queue.size());
		logger.debug("1st event: {}", gson.toJson(queue.get(0)));

		// Batch insert rows
		if (sqlManager.writeEvents(queue, macToTopologyMap, topologyNameMap)) {
			logger.info("Successfully wrote {} event(s) to MySQL.", queue.size());
			return true;
		} else {
			return false;
		}
	}

	@Override
	public void init() {
		// Initialize database connection
		try {
			this.sqlManager = new TgMySqlManager(config.host, config.port, config.db, config.username, config.password);
		} catch (Exception e) {
			logger.error("MySQL connection failed.", e);
			throw new RuntimeException(e);
		}

		// Fetch topologies immediately (synchronously) and periodically (asynchronously)
		fetchTopologies();
		executor.scheduleAtFixedRate(
			this::fetchTopologies,
			topologyFetchIntervalSec,
			topologyFetchIntervalSec,
			TimeUnit.SECONDS
		);
	}

	@Override
	public void close() {
		executor.shutdownNow();
		if (sqlManager != null) {
			try {
				sqlManager.close();
			} catch (IOException e) {}
		}
	}

	/**
	 * Fetch all topologies from MySQL, then via each API service.
	 * When finished, update {@link #macToTopologyMap}.
	 */
	private void fetchTopologies() {
		// Fetch topology list from MySQL
		List<TopologyConfig> configs = sqlManager.fetchTopologies();
		if (configs == null || configs.isEmpty()) {
			return;
		}

		// Fetch topology structs via API services
		TgTopologyFetcher.updateTopologies(configs);

		// Construct node map
		Map<String, String> macToTopologyMap = new TreeMap<>();
		Map<String, String> topologyNameMap = new TreeMap<>();
		for (TopologyConfig config : configs) {
			if (config.topology == null) {
				continue;
			}
			try {
				JSONArray nodes = config.topology.getJSONArray("nodes");
				for (int i = 0; i < nodes.length(); i++) {
					JSONObject node = nodes.getJSONObject(i);
					macToTopologyMap.put(node.getString("mac_addr"), config.name);
				}
				if (!config.topology.getString("name").isEmpty()) {
					topologyNameMap.put(config.topology.getString("name"), config.name);
				}
			} catch (JSONException e) {
				logger.error(String.format("Failed to parse topology: %s", config.name), e);
				continue;
			}
		}
		logger.debug("Finished updating {} topologies, with {} total nodes.", configs.size(), macToTopologyMap.size());
		synchronized (this) {
			this.macToTopologyMap = macToTopologyMap;
			this.topologyNameMap = topologyNameMap;
		}
	}
}
