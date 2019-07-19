/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.terragraph.connector.models.Config.MySqlParams;
import com.terragraph.connector.models.Event;
import com.terragraph.connector.tg.TgMySqlManager;

/**
 * MySQL client for pushing events.
 */
public class MySqlEventClient extends ClientBase<Event, Event> {
	private static final Logger logger = LoggerFactory.getLogger(MySqlEventClient.class);

	/** The MySQL manager instance. */
	private TgMySqlManager sqlManager;

	/** The thread executor for the topology fetcher. */
	private final ScheduledExecutorService executor;

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The client configuration. */
	private final MySqlParams config;

	/** Constructor. */
	public MySqlEventClient(MySqlParams config, int topologyFetchIntervalSec)
		throws InstantiationException, IllegalAccessException, ClassNotFoundException, SQLException {
		super(config.minBatchSize, config.maxQueueIntervalMs);
		this.config = config;
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
		if (sqlManager.writeEvents(queue)) {
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
}
