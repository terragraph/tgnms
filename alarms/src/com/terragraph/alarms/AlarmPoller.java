/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.alarms.Alarm.AlarmSeverity;
import com.terragraph.alarms.Alarm.EventType;

/**
 * Poller and alarm generator.
 */
public class AlarmPoller {
	private static final Logger logger = LoggerFactory.getLogger(AlarmPoller.class);

	/** The configuration. */
	private final Config config;

	/** The polling interval (in seconds). */
	private final long pollInterval;

	/** The polling endpoints. */
	private final Map<String, URL> pollEndpoints = new HashMap<>();

	/** The syslog sender. */
	private final SyslogSender sender;

	/** The alarm data. */
	private final AlarmData alarmData;

	/** The last time {@link #poll()} was executed (in Unix time). */
	private long lastExecutionTime = 0;

	/**
	 * Initialize the alarm poller with the given configuration.
	 * @param config The configuration to use.
	 * @throws MalformedURLException
	 */
	public AlarmPoller(Config config) throws MalformedURLException {
		this.config = config;
		this.pollInterval = config.systemConfig.pollIntervalSeconds;
		for (Map.Entry<String, String> endpoint : config.systemConfig.topologyEndpoints.entrySet()) {
			pollEndpoints.put(endpoint.getKey(), new URL(endpoint.getValue()));
		}
		this.sender = new SyslogSender(
			config.syslogConfig.appName,
			config.syslogConfig.facility,
			config.syslogConfig.severity,
			config.syslogConfig.serverHost,
			config.syslogConfig.serverPort,
			config.syslogConfig.transportProtocol
		);
		this.alarmData = new AlarmData(config.alarmConfig);
	}

	/**
	 * Starts polling endpoints.
	 */
	public void start() {
		ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
		scheduler.scheduleAtFixedRate(() -> poll(), 0, pollInterval, TimeUnit.SECONDS);
	}

	/**
	 * Polls all endpoints (called by scheduler).
	 */
	private void poll() {
		long now = System.currentTimeMillis() / 1000L;
		if (now - lastExecutionTime < pollInterval) {
			return;  // rate-limit to prevent queue growing infinitely if this is slow
		}
		lastExecutionTime = now;

		// Send a heartbeat
		sendAlarm(new Alarm(null, AlarmSeverity.INFO, EventType.HEARTBEAT, "", null));

		// Poll each topology endpoint
		for (Map.Entry<String, URL> endpoint : pollEndpoints.entrySet()) {
			try {
				pollEndpoint(endpoint.getKey(), endpoint.getValue());
			} catch (Exception e) {
				logger.error("An exception occurred.", e);
			}
		}
	}

	/**
	 * Polls the given endpoint.
	 * @param name The endpoint name
	 * @param url The endpoint URL
	 * @throws IOException
	 */
	private void pollEndpoint(String name, URL url) throws IOException {
		logger.info("Polling topology for \"{}\"...", name);

		// Fetch the topology
		String topologyJson = null;
		try {
			topologyJson = readDataFromUrl(url, "{}");
		} catch (IOException e) {
			logger.error("Failed to fetch topology from endpoint.", e);
		}

		// Update all alarm data
		List<Alarm> newAlarms;
		if (topologyJson == null) {
			// Assume fetch error means controller is dead
			newAlarms = alarmData.update(name);
		} else {
			// Update with new topology
			newAlarms = alarmData.update(name, Topology.fromJson(topologyJson));
		}

		// Send alarms
		for (Alarm alarm : newAlarms) {
			logger.info("Sending alarm: {}", alarm.toString());
			sendAlarm(alarm);
		}
	}

	/**
	 * Sends a request to the given URL, and returns the response as a string.
	 * @param url The remote URL
	 * @param postData If non-null, the POST data to send; otherwise, send a GET request
	 * @return The response as a string
	 * @throws IOException
	 */
    public String readDataFromUrl(URL url, String postData) throws IOException {
		// Open a connection
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		conn.setConnectTimeout(config.systemConfig.connectTimeoutMilliseconds);
		conn.setReadTimeout(config.systemConfig.readTimeoutMilliseconds);
		conn.setUseCaches(false);
		if (postData != null) {
			conn.setRequestMethod("POST");
			conn.setDoOutput(true);
			try (OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream())) {
				writer.write(postData);
				writer.flush();
			}
		}
		try {
			conn.connect();
		} catch (SocketTimeoutException e) {
			logger.error("Connection to server timed out.", e);
			throw e;
		}

		// Read the response
		try (InputStream in = conn.getInputStream()) {
			BufferedReader reader = new BufferedReader(new InputStreamReader(in));
			StringBuilder sb = new StringBuilder();
			int c;
			while ((c = reader.read()) != -1) {
				sb.append((char) c);
			}
			return sb.toString();
		} catch (SocketTimeoutException e) {
			logger.error("Connection to server timed out.", e);
			throw e;
		}
	}

	/**
	 * Sends the given alarm.
	 * @param alarm The alarm to send
	 * @return true if the alarm was sent, or false upon failure
	 */
	private boolean sendAlarm(Alarm alarm) {
		String message = alarm.toString();
		try {
			sender.sendMessage(message);
			return true;
		} catch (IOException e) {
			logger.error(String.format("Failed to send alarm: %s", message), e);
			return false;
		}
	}
}
