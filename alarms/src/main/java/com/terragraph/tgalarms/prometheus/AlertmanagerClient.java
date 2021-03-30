/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.prometheus;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import javax.ws.rs.core.MediaType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.terragraph.tgalarms.AlarmService;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.Event;

/**
 * Prometheus Alertmanager client to periodically push alarms via the v2 API.
 */
public class AlertmanagerClient {
	private static final Logger logger = LoggerFactory.getLogger(AlertmanagerClient.class);

	/** RFC 3339 (ISO 8601) time format. */
	private static final SimpleDateFormat RFC3339_FORMAT =
		new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");

	/** The associated alarm service to poll. */
	private final AlarmService service;

	/** The Prometheus Alertmanager alerts API URL. */
	private final URL alertmanagerAlarmsUrl;

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** Scheduler for pushing alarms. */
	private ScheduledExecutorService scheduledExecutor;

	/** Constructor. */
	public AlertmanagerClient(
		AlarmService service,
		String alertmanagerHost,
		int alertmanagerPort
	) throws MalformedURLException {
		this.service = service;
		this.alertmanagerAlarmsUrl =
			getApiUrl(alertmanagerHost, alertmanagerPort, "api/v2/alerts");
	}

	/**
	 * Start periodically pushing alarms to the Prometheus Alertmanager API.
	 * @param period the push interval (in seconds)
	 * @param initialDelay the initial delay (in seconds)
	 */
	public void start(int period, int initialDelay) {
		this.scheduledExecutor = Executors.newSingleThreadScheduledExecutor();
		addShutdownHook();
		scheduledExecutor.scheduleAtFixedRate(
			this::tryPushAlarms, initialDelay, period, TimeUnit.SECONDS);
	}

	/** Shutdown hook to clean up executors. */
	private void addShutdownHook() {
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			if (scheduledExecutor != null && !scheduledExecutor.isShutdown()) {
				scheduledExecutor.shutdownNow();
				scheduledExecutor = null;
			}
		}));
	}

	/** Invoke {@link #pushAlarms()} and catch all exceptions (to avoid halting the scheduler). */
	private void tryPushAlarms() {
		try {
			pushAlarms();
		} catch (Exception e) {
			logger.error("Uncaught exception while pushing alarms to Prometheus Alertmanager.", e);
		}
	}

	/** Push all current alarms to the Prometheus Alertmanager. */
	private void pushAlarms() {
		// Build list of active alerts
		List<AlertmanagerAlert> alerts = getAlerts();
		if (alerts.isEmpty()) {
			return;  // nothing to push
		}

		// Post to alerts API
		logger.info("Pushing {} alert(s) to Alertmanager", alerts.size());
		try {
			HttpUtils.sendPostRequest(
				alertmanagerAlarmsUrl,
				gson.toJson(alerts),
				MediaType.APPLICATION_JSON
			);
		} catch (IOException e) {
			logger.error("Failed to push alarms to Prometheus Alertmanager.", e);
		}
	}

	/** Return a list of alertmanager alerts from the current alarms. */
	protected List<AlertmanagerAlert> getAlerts() {
		return service.getAlarms().stream()
			.filter(alarm ->
			!alarm.isHidden() &&
			service.getAlarmRule(alarm.getRuleName()) != null
		)
		.map(alarm ->
			buildAlert(alarm, service.getAlarmRule(alarm.getRuleName()))
		)
		.collect(Collectors.toList());
	}

	/** Build an AlertmanagerAlert instance from an alarm and rule. */
	private AlertmanagerAlert buildAlert(Alarm alarm, AlarmRule rule) {
		AlertmanagerAlert alert = new AlertmanagerAlert();
		alert.startsAt = RFC3339_FORMAT.format(
			Date.from(Instant.ofEpochSecond(alarm.getCreationTime()))
		);
		alert.labels.put("alertname", alarm.getRuleName());
		alert.labels.put("id", alarm.getId());
		alert.labels.put("severity", alarm.getSeverity().toString());
		if (alarm.getEntity() != null) {
			alert.labels.put("entity", alarm.getEntity());
		}
		Optional<Event> eventWithTopology = alarm.getEvents().stream()
			.filter(e -> e.topologyName != null)
			.findAny();
		if (eventWithTopology.isPresent()) {
			alert.labels.put("network", eventWithTopology.get().topologyName);
		}
		if (rule.getExtraLabels() != null) {
			rule.getExtraLabels().entrySet().forEach(entry ->
				alert.labels.put(entry.getKey(), entry.getValue())
			);
		}
		alert.annotations.put("description", rule.getDescription());
		alert.annotations.put("eventId", Integer.toString(rule.getEventId()));
		alert.annotations.put("events", gson.toJson(alarm.getEvents()));
		if (rule.getExtraAnnotations() != null) {
			rule.getExtraAnnotations().entrySet().forEach(entry ->
				alert.annotations.put(entry.getKey(), entry.getValue())
			);
		}
		alert.generatorURL = "";  // TODO
		return alert;
	}

	/** Return the Alertmanager URL for the given IP/port and endpoint. */
	private static URL getApiUrl(String ip, int port, String endpoint) throws MalformedURLException {
		String host = HttpUtils.isIPv6Address(ip) ? String.format("[%s]", ip) : ip;
		return new URL(String.format("http://%s:%d/%s", host, port, endpoint));
	}
}
