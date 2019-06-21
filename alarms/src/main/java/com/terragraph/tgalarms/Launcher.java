/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import java.io.File;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.tgalarms.kafka.KafkaPipe;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

/**
 * Alarm service launcher.
 */
@Command(
	name = "Terragraph Alarm Service",
	description = "Service for generating alarms from an events stream.",
	sortOptions = false,
	version = "1",
	mixinStandardHelpOptions = true
)
public class Launcher implements Runnable {
	private static final Logger logger = LoggerFactory.getLogger(Launcher.class);

	@Option(
		names = { "-r", "--rules" },
		description = "Alarm rules file (created if non-existent)",
		required = true
	)
	private File alarmRulesFile;

	@Option(
		names = { "-p", "--port" },
		description = "Web server port (default: ${DEFAULT-VALUE})"
	)
	private int port = 40000;

	@Option(
		names = { "--disable-http-server" },
		description = "Disable the web server (default: ${DEFAULT-VALUE})"
	)
	private boolean disableHttpServer = false;

	@Option(
		names = { "--enable-events-writer" },
		description = "Enable the /events_writer HTTP endpoint (default: ${DEFAULT-VALUE})"
	)
	private boolean enableEventsWriterEndpoint = false;

	@Option(
		names = { "-s", "--servers" },
		description = "Kafka bootstrap servers (default: ${DEFAULT-VALUE})"
	)
	private String kafkaBootstrapServers = "";

	@Option(
		names = { "--source-topic" },
		description = "Kafka source topic (default: ${DEFAULT-VALUE})"
	)
	private String kafkaSourceTopic = "events";

	@Option(
		names = { "--sink-topic" },
		description = "Kafka sink topic (default: ${DEFAULT-VALUE})"
	)
	private String kafkaSinkTopic = "alarms";

	/** Run the alarm service. */
	private void runImpl() throws Exception {
		// Instantiate service and load rules
		AlarmService service = new AlarmService();
		service.loadAlarmRules(alarmRulesFile);
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			// Save alarm rules on exit
			try {
				service.saveAlarmRules(alarmRulesFile);
			} catch (IOException e) {}
		}));

		// Create Kafka pipe
		if (!kafkaBootstrapServers.isEmpty()) {
			KafkaPipe pipe = new KafkaPipe(service);
			pipe.start(kafkaBootstrapServers, kafkaSourceTopic, kafkaSinkTopic);
		}

		// Start HTTP server
		if (!disableHttpServer) {
			AlarmServer server = new AlarmServer(service, port, enableEventsWriterEndpoint);
			server.start();
		}
	}

	@Override
	public void run() {
		try {
			runImpl();
		} catch (Exception e) {
			logger.error("****** FATAL EXCEPTION ******", e);
		}
	}

	/** Main method. */
	public static void main(String[] args) throws Exception {
		CommandLine.run(new Launcher(), args);
	}
}
