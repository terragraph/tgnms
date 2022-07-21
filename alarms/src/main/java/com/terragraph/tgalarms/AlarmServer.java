/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.terragraph.tgalarms;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.PriorityQueue;
import java.util.Set;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import org.reflections.Reflections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.Event;
import com.terragraph.tgalarms.models.EventWriterRequest;

import io.swagger.v3.core.util.Json;
import io.swagger.v3.core.util.Yaml;
import io.swagger.v3.jaxrs2.Reader;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.models.OpenAPI;
import spark.Route;
import spark.Spark;

/**
 * Basic web server for managing alarms.
 */
@OpenAPIDefinition(
	info = @Info(
		title = "Terragraph Alarm Service",
		version = "1.0.0",
		description = "This document describes the HTTP API for Terragraph's alarm service."
	),
	tags = {
		@Tag(name = "Alarms"),
		@Tag(name = "Alarm Rules")
	}
)
public class AlarmServer {
	private static final Logger logger = LoggerFactory.getLogger(AlarmServer.class);

	/** The alarm service instance. */
	private final AlarmService alarmService;

	/** Whether to enable the {@link #recvEvents(spark.Request, spark.Response)} endpoint. */
	private final boolean enableEventsWriterEndpoint;

	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The cached OpenAPI instance. */
	private OpenAPI openApi;

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
		// Configure API docs hosting
		Spark.staticFiles.location("/public");
		Spark.redirect.get("/docs", "/docs/");
		Spark.get("/docs/openapi.yaml", this::getOpenApiYaml);
		Spark.get("/docs/openapi.json", this::getOpenApiJson);

		// Install routes
		Spark.before(this::beforeFilter);
		Spark.get("/alarms", new GetAlarmsEndpoint());
		Spark.get("/rules", new GetRulesEndpoint());
		Spark.post("/add_rule", new AddRuleEndpoint());
		Spark.post("/del_rule", new DelRuleEndpoint());
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

	@Path("/alarms")
	public class GetAlarmsEndpoint implements Route {
		@GET
		@Produces({ MediaType.APPLICATION_JSON })
		@Operation(
			summary = "Get alarms",
			description = "Returns a list of all active alarms",
			operationId = "alarms",
			tags = {"Alarms"},
			responses = {
				@ApiResponse(
					responseCode = "200",
					description = "List of alarms",
					content = @Content(array = @ArraySchema(schema = @Schema(implementation = Alarm.class)))
				)
			}
		)
		@Override
		public String handle(
			@Parameter(hidden = true) spark.Request request,
			@Parameter(hidden = true) spark.Response response
		) {
			response.type(MediaType.APPLICATION_JSON);
			return gson.toJson(alarmService.getAlarms());
		}
	}

	@Path("/rules")
	public class GetRulesEndpoint implements Route {
		@GET
		@Produces({ MediaType.APPLICATION_JSON })
		@Operation(
			summary = "Get alarm rules",
			description = "Returns a list of all alarm rules",
			operationId = "rules",
			tags = {"Alarm Rules"},
			responses = {
				@ApiResponse(
					responseCode = "200",
					description = "List of alarm rules",
					content = @Content(array = @ArraySchema(schema = @Schema(implementation = AlarmRule.class)))
				)
			}
		)
		@Override
		public String handle(
			@Parameter(hidden = true) spark.Request request,
			@Parameter(hidden = true) spark.Response response
		) {
			response.type(MediaType.APPLICATION_JSON);
			return gson.toJson(alarmService.getAlarmRules());
		}
	}

	@Path("/add_rule")
	public class AddRuleEndpoint implements Route {
		@POST
		@Operation(
			summary = "Add alarm rule",
			description = "Add a new alarm rule",
			operationId = "add_rule",
			tags = {"Alarm Rules"},
			requestBody = @RequestBody(
				description = "New alarm rule",
				required = true,
				content = @Content(schema = @Schema(implementation = AlarmRule.class))
			),
			responses = {
				@ApiResponse(description = "Success", responseCode = "200"),
				@ApiResponse(description = "Failure", responseCode = "400")
			}
		)
		@Override
		public String handle(
			@Parameter(hidden = true) spark.Request request,
			@Parameter(hidden = true) spark.Response response
		) {
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
	}

	@Path("/del_rule")
	public class DelRuleEndpoint implements Route {
		@POST
		@Operation(
			summary = "Delete alarm rule",
			description = "Delete an existing alarm rule",
			operationId = "del_rule",
			tags = {"Alarm Rules"},
			parameters = {
				@Parameter(
					name = "name",
					description = "Alarm rule name",
					in = ParameterIn.QUERY,
					required = true,
					schema = @Schema(type = "string")
				)
			},
			responses = {
				@ApiResponse(description = "Success", responseCode = "200"),
				@ApiResponse(description = "Failure", responseCode = "400")
			}
		)
		@Override
		public String handle(
			@Parameter(hidden = true) spark.Request request,
			@Parameter(hidden = true) spark.Response response
		) {
			String name = request.queryParams("name");
			if (name != null && alarmService.deleteAlarmRule(name)) {
				response.status(200);
			} else {
				response.status(400);
			}
			return "";
		}
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

	/** Generates and caches the OpenAPI object (if not already cached). */
	private void genOpenApi() {
		if (openApi == null) {
			// Find all annotated classes
			Reflections reflections = new Reflections(this.getClass().getName());
			Set<Class<?>> apiClasses = reflections.getTypesAnnotatedWith(Path.class);
			apiClasses.add(this.getClass());

			// Scan annotations
			Reader reader = new Reader(new OpenAPI());
			this.openApi = reader.read(apiClasses);
		}
	}

	/** Return an OpenAPI 3.0 YAML document. */
	private String getOpenApiYaml(spark.Request request, spark.Response response) {
		genOpenApi();
		response.type(MediaType.TEXT_PLAIN);
		return Yaml.pretty(openApi);
	}

	/** Return an OpenAPI 3.0 JSON document. */
	private String getOpenApiJson(spark.Request request, spark.Response response) {
		genOpenApi();
		response.type(MediaType.APPLICATION_JSON);
		return Json.pretty(openApi);
	}
}
