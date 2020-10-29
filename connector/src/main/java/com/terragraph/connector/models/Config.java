/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.models;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

/**
 * Service configuration.
 */
public class Config {
	public static abstract class EndpointConfig {
		public boolean enabled;
		public int minBatchSize;
		public int maxQueueIntervalMs;
	}
	public static class OdsParams extends EndpointConfig {
		public String remoteEndpoint;
		public String accessToken;
		public int categoryId;
		public String entityPrefix;
		public String keyPrefix;
	}
	public static class PelicanParams extends EndpointConfig {
		public String remoteEndpoint;
		public String accessToken;
	}
	public static class ScribeParams extends EndpointConfig {
		public String remoteEndpoint;
		public String accessToken;
	}
	public static class MySqlParams extends EndpointConfig {
		public String host;
		public int port;
		public String username;
		public String password;
		public String db;
	}
	public static class TgParams {
		public int topologyFetchIntervalSec;
	}
	public static class KafkaParams {
		public static class KafkaConfig {
			public String brokerEndpointList;
		}
		public static class KafkaTopics {
			public String eventsTopic;
			public String statsTopic;
			public String hfStatsTopic;
		}
		public KafkaConfig config = new KafkaConfig();
		public KafkaTopics topics = new KafkaTopics();
		public Map<String, String> highFrequencyStatsWhitelist = new HashMap<>();
		public Map<String, String> consumerConfig = new HashMap<>();
	}
	public OdsParams odsParams = new OdsParams();
	public PelicanParams pelicanParams = new PelicanParams();
	public ScribeParams scribeParams = new ScribeParams();
	public MySqlParams mySqlParams = new MySqlParams();
	public TgParams tgParams = new TgParams();
	public KafkaParams kafkaParams = new KafkaParams();

	/** Return the default configuration. */
	public static Config createDefaultConfig() {
		Config config = new Config();
		config.odsParams.enabled = true;
		config.odsParams.minBatchSize = 10000;
		config.odsParams.maxQueueIntervalMs = 5000;
		config.odsParams.remoteEndpoint = "https://graph.facebook.com/ods_metrics";
		config.odsParams.accessToken = "199795630387734|bd866aa7c4ac37883d5d8026b2eb8622";
		config.odsParams.categoryId = 927;
		config.odsParams.entityPrefix = "CXL-Node-Test-";
		config.odsParams.keyPrefix = "";
		config.pelicanParams.enabled = true;
		config.pelicanParams.minBatchSize = 2000;
		config.pelicanParams.maxQueueIntervalMs = 5000;
		config.pelicanParams.remoteEndpoint = "https://graph.facebook.com/pelican_data";
		config.pelicanParams.accessToken = "537532803330477|8f126c038b9399be59d665357c6f301a";
		config.scribeParams.enabled = false;
		config.scribeParams.minBatchSize = 10;
		config.scribeParams.maxQueueIntervalMs = 5000;
		config.scribeParams.remoteEndpoint = "https://graph.facebook.com/scribe_logs";
		config.scribeParams.accessToken = "199795630387734|bd866aa7c4ac37883d5d8026b2eb8622";
		config.mySqlParams.enabled = false;
		config.mySqlParams.minBatchSize = 10;
		config.mySqlParams.maxQueueIntervalMs = 5000;
		config.mySqlParams.host = "localhost";
		config.mySqlParams.port = 3306;
		config.mySqlParams.username = "root";
		config.mySqlParams.password = "";
		config.mySqlParams.db = "cxl";
		config.tgParams.topologyFetchIntervalSec = 30;
		config.kafkaParams.config.brokerEndpointList = "";
		config.kafkaParams.topics.eventsTopic = "events";
		config.kafkaParams.topics.statsTopic = "stats";
		config.kafkaParams.topics.hfStatsTopic = "hf_stats";
		config.kafkaParams.highFrequencyStatsWhitelist.put(
			"staPktStats", ".*staPkt\\.(.*Fail|.*Ok|mcs|perE6|.*Ba|.*Ppdu|txPowerIndex|linkAvailable|mgmtLinkUp)"
		);
		config.kafkaParams.highFrequencyStatsWhitelist.put("phyStatusStats", ".*phystatus\\.(ssnrEst|srssi)");
		config.kafkaParams.highFrequencyStatsWhitelist.put("latpcStats", ".*noTrafficCountSF");
		config.kafkaParams.consumerConfig.put("max.poll.records", "1000" /* default = 500 */);
		return config;
	}

	/** Load configuration from the given file (in JSON format). */
	public static Config loadConfig(File f) throws FileNotFoundException, IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(f))) {
            return new Gson().fromJson(reader, Config.class);
        }
	}

	/** Save configuration to the given file (in JSON format). */
	public static void saveConfig(Config config, File f) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(f))) {
            writer.append(new GsonBuilder().setPrettyPrinting().create().toJson(config));
        }
	}
}
