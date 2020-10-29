/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector;

import java.io.File;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.connector.consumers.KafkaConsumerPipe;
import com.terragraph.connector.endpoints.FbOdsClient;
import com.terragraph.connector.endpoints.FbPelicanClient;
import com.terragraph.connector.endpoints.FbScribeClient;
import com.terragraph.connector.endpoints.MySqlEventClient;
import com.terragraph.connector.models.AggrStat;
import com.terragraph.connector.models.Config;
import com.terragraph.connector.models.Event;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

/**
 * Terragraph connector service launcher.
 */
@Command(
	name = "Terragraph Connector Service",
	description = "Service for publishing stats and events from Kafka to other systems.",
	sortOptions = false,
	version = "1",
	mixinStandardHelpOptions = true
)
public class Launcher implements Runnable {
	private static final Logger logger = LoggerFactory.getLogger(Launcher.class);

	@Command(
		name = "run",
		description = "Run the connector service.",
		sortOptions = false
	)
	void _run(
		@Option(
			names = { "-f", "--file" },
			description = "The config file path",
			required = true
		)
		File configFile
	) throws Exception {
		// Load and validate config
		if (!configFile.isFile()) {
			logger.error("The given config file does not exist: {}", configFile.getAbsolutePath());
			System.exit(1);
			return;
		}
		Config config;
		try {
			config = Config.loadConfig(configFile);
		} catch (IOException e) {
			logger.error("Failed to load config.", e);
			System.exit(1);
			return;
		}
		if (config.kafkaParams.config.brokerEndpointList == null ||
			config.kafkaParams.config.brokerEndpointList.isEmpty()) {
			logger.error("No Kafka brokers specified in config file.");
			System.exit(1);
			return;
		}
		logger.info("Using Kafka brokers: {}", config.kafkaParams.config.brokerEndpointList);

		// Start consumers
		if (config.odsParams.enabled) {
			logger.info("Starting ODS stats consumer...");
			KafkaConsumerPipe<AggrStat> statsOdsConsumer = new KafkaConsumerPipe<>(
				AggrStat.class,
				"connector-ods",
				config.kafkaParams.config.brokerEndpointList,
				config.kafkaParams.topics.statsTopic,
				config.kafkaParams.consumerConfig,
				new FbOdsClient(config.odsParams)
			);
			statsOdsConsumer.start();
		} else {
			logger.info("ODS stats consumer is disabled.");
		}
		if (config.pelicanParams.enabled) {
			logger.info("Starting Pelican stats consumers...");

			// Normal frequency stats
			FbPelicanClient statsPelicanClient = new FbPelicanClient(config.pelicanParams);
			if (!config.kafkaParams.highFrequencyStatsWhitelist.isEmpty()) {
				statsPelicanClient.setBlacklist(config.kafkaParams.highFrequencyStatsWhitelist.values());
			}
			KafkaConsumerPipe<AggrStat> statsPelicanConsumer = new KafkaConsumerPipe<>(
				AggrStat.class,
				"connector-pelican",
				config.kafkaParams.config.brokerEndpointList,
				config.kafkaParams.topics.statsTopic,
				config.kafkaParams.consumerConfig,
				statsPelicanClient
			);
			statsPelicanConsumer.start();

			// High frequency stats
			FbPelicanClient hfStatsPelicanClient = new FbPelicanClient(config.pelicanParams);
			if (!config.kafkaParams.highFrequencyStatsWhitelist.isEmpty()) {
				hfStatsPelicanClient.setWhitelist(config.kafkaParams.highFrequencyStatsWhitelist.values());
			}
			KafkaConsumerPipe<AggrStat> hfStatsPelicanConsumer = new KafkaConsumerPipe<>(
				AggrStat.class,
				"connector-pelican-hf",
				config.kafkaParams.config.brokerEndpointList,
				config.kafkaParams.topics.hfStatsTopic,
				config.kafkaParams.consumerConfig,
				hfStatsPelicanClient
			);
			hfStatsPelicanConsumer.start();
		} else {
			logger.info("Pelican stats consumer is disabled.");
		}
		if (config.scribeParams.enabled) {
			logger.info("Starting Scribe events consumer...");
			KafkaConsumerPipe<Event> eventsScribeConsumer = new KafkaConsumerPipe<>(
				Event.class,
				"connector-scribe",
				config.kafkaParams.config.brokerEndpointList,
				config.kafkaParams.topics.eventsTopic,
				config.kafkaParams.consumerConfig,
				new FbScribeClient(config.scribeParams)
			);
			eventsScribeConsumer.start();
		} else {
			logger.info("Scribe events consumer is disabled.");
		}
		if (config.mySqlParams.enabled) {
			logger.info("Starting MySQL events writer...");
			KafkaConsumerPipe<Event> eventsMySqlWriter = new KafkaConsumerPipe<>(
				Event.class,
				"connector-mysql-events",
				config.kafkaParams.config.brokerEndpointList,
				config.kafkaParams.topics.eventsTopic,
				config.kafkaParams.consumerConfig,
				new MySqlEventClient(config.mySqlParams, config.tgParams.topologyFetchIntervalSec)
			);
			eventsMySqlWriter.start();
		} else {
			logger.info("MySQL events writer is disabled.");
		}
	}

	@Command(
		name = "generate-config",
		description = "Create a new default config file.",
		sortOptions = false
	)
	void _generateConfig(
		@Option(
			names = { "-f", "--file" },
			description = "The config file path",
			required = true
		)
		File configFile,

		@Option(
			names = { "-s", "--servers" },
			description = "The Kafka bootstrap servers"
		)
		String kafkaBootstrapServers
	) {
		if (configFile.isFile()) {
			logger.error("Config file already exists, aborting...");
			System.exit(1);
			return;
		}
		Config config = Config.createDefaultConfig();
		if (kafkaBootstrapServers != null) {
			config.kafkaParams.config.brokerEndpointList = kafkaBootstrapServers;
		}
		try {
			Config.saveConfig(config, configFile);
			logger.info("Wrote config to file: {}", configFile.getAbsolutePath());
		} catch (IOException e) {
			logger.error("Failed to save config.", e);
			System.exit(1);
		}
	}

	@Override
	public void run() {
		CommandLine.usage(this, System.out);
		System.exit(1);
	}

	/** Main method. */
	public static void main(String[] args) throws Exception {
		CommandLine.run(new Launcher(), args);
	}
}
