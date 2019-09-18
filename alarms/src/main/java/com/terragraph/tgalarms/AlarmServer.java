/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.PriorityQueue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.Event;
import com.terragraph.tgalarms.models.EventWriterRequest;

import spark.Spark;

/**
 * Basic web server for managing alarms.
 */
public class AlarmServer {
	private static final Logger logger = LoggerFactory.getLogger(AlarmServer.class);

	/** The alarm service instance. */
	private final AlarmService alarmService;

	/** Whether to enable the {@link #recvEvents(spark.Request, spark.Response)} endpoint. */
	private final boolean enableEventsWriterEndpoint;

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** Initialize the web server. */
	public AlarmServer(AlarmService service, int port)
		throws FileNotFoundException, IOException {
		this(service, port, false);
	}

	/** Initialize the web server. */
	public AlarmServer(AlarmService service, int port, boolean enableEventsWriterEndpoint)
		throws FileNotFoundException, IOException {
		this.alarmService = service;
		this.enableEventsWriterEndpoint = enableEventsWriterEndpoint;
		Spark.port(port);
	}

	/** Start the server. */
	public void start() throws InterruptedException {
		Spark.before(this::beforeFilter);
		Spark.get("/alarms", this::listAlarms);
		Spark.get("/rules", this::listRules);
		Spark.post("/add_rule", this::addRule);
		Spark.post("/del_rule", this::delRule);
		if (enableEventsWriterEndpoint) {
			Spark.post("/events_writer", this::recvEvents);
		}
		logger.info("HTTP server listening on port {}...", Spark.port());
	}

	/** Stop the server. */
	public void stop() {
		Spark.stop();
	}

	/** Filter evaluated before each request. */
	private void beforeFilter(spark.Request request, spark.Response response) {
		// Remove "Server: Jetty" header
		response.header("Server", "");
	}

	/** Retrieves all active alarms. */
	private String listAlarms(spark.Request request, spark.Response response) {
		response.type("application/json");
		return gson.toJson(alarmService.getAlarms());
	}

	/** Retrieves all alarm rules. */
	private String listRules(spark.Request request, spark.Response response) {
		response.type("application/json");
		return gson.toJson(alarmService.getAlarmRules());
	}

	/** Add a new alarm rule. */
	private String addRule(spark.Request request, spark.Response response) {
		// Parse request
		try {
			AlarmRule rule = gson.fromJson(request.body(), AlarmRule.class);
			if (rule != null && alarmService.addAlarmRule(rule)) {
				response.status(200);
			} else {
				response.status(400);
			}
		} catch (JsonSyntaxException e) {
			response.status(400);
		}
		return "";
	}

	/** Delete an existing alarm rule. */
	private String delRule(spark.Request request, spark.Response response) {
		String name = request.queryParams("name");
		if (name != null && alarmService.deleteAlarmRule(name)) {
			response.status(200);
		} else {
			response.status(400);
		}
		return "";
	}

	/** Receive new events from the TG aggregator. */
	private String recvEvents(spark.Request request, spark.Response response) {
		// Parse request
		EventWriterRequest req;
		try {
			req = gson.fromJson(request.body(), EventWriterRequest.class);
		} catch (JsonSyntaxException e) {
			response.status(400);
			return "";
		}

		// Order events by timestamp (ascending)
		PriorityQueue<Event> pq = new PriorityQueue<>(11, (a, b) -> Long.compare(a.timestamp, b.timestamp));
		for (int i = 0; i < req.agents.length; i++) {
			EventWriterRequest.AgentEntry agent = req.agents[i];
			for (int j = 0; j < agent.events.length; j++) {
				Event e = agent.events[j];
				pq.offer(e);
			}
		}

		// Add events to queue
		logger.info("Received {} events from {} agents", pq.size(), req.agents.length);
		while (!pq.isEmpty()) {
			Event e = pq.poll();
			alarmService.processEvent(e);
		}

		response.status(200);
		return "";
	}
}
