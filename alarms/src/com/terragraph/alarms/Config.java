/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.terragraph.alarms.Alarm.AlarmSeverity;

/**
 * Configuration structure.
 */
public class Config {
	/** System configuration. */
	public static class SystemConfig {
		/** The polling interval (in seconds). */
		public int pollIntervalSeconds = 30;

		/** The Terragraph API Service endpoint for requesting the topology. */
		public Map<String, String> topologyEndpoints = new HashMap<>();

		/** The connection timeout (in milliseconds). */
		public int connectTimeoutMilliseconds = 5000;

		/** The read timeout (in milliseconds). */
		public int readTimeoutMilliseconds = 10000;

		/** Default constructor. */
		public SystemConfig() {
			topologyEndpoints.put("Terragraph", "http://localhost:80/api/getTopology");
		}
	}

	/** Syslog configuration. */
	public static class SyslogConfig {
		/** The syslog server hostname. */
		public String serverHost = "localhost";

		/** The syslog server port. */
		public int serverPort = 9898;

		/** The syslog transport protocol to use. */
		public SyslogSender.TransportProtocol transportProtocol = SyslogSender.TransportProtocol.TCP;

		/** The "facility" for messages (as the facility code). */
		public int facility = 23;

		/** The "severity" for messages (as the severity level). */
		public int severity = 6;

		/** The default "appName" for messages. */
		public String appName = "Terragraph";
	}

	/** Alarm configuration. */
	public static class AlarmConfig {
		/** Common alarm parameters. */
		public static class AlarmParams {
			/** For network alarms, the minimum percentage of alarm-specific nodes that must be offline. */
			public Integer networkDownPercent;

			/** The number of consecutive polls where the alarm condition is met before the alarm fires. */
			public Integer consecutivePolls;

			/** The severity of the alarm (within the syslog message contents, NOT the syslog severity level). */
			public AlarmSeverity alarmSeverity;

			/** Constructor. */
			public AlarmParams(Integer networkDownPercent, Integer consecutivePolls, AlarmSeverity alarmSeverity) {
				this.networkDownPercent = networkDownPercent;
				this.consecutivePolls = consecutivePolls;
				this.alarmSeverity = alarmSeverity;
			}
		}

		/** The interval at which alarms should be repeated if still active. */
		public int repeatIntervalSeconds = 900;

		/** Alarm for network-wide DN disruption. */
		public AlarmParams[] networkDnDown;

		/** Alarm for network-wide CN disruption. */
		public AlarmParams[] networkCnDown;

		/** Alarms for individual DN disruption. */
		public AlarmParams[] nodeDnDown;

		/** Alarms for individual POP Primary-DN disruption. */
		public AlarmParams[] nodePopPrimaryDown;

		/** Alarms for DN-to-DN link disruption. */
		public AlarmParams[] linkDn2DnDown;

		/** Alarm for primary controller unreachability. */
		public AlarmParams[] primaryControllerDown;

		/** Default constructor. */
		public AlarmConfig() {
			networkDnDown = new AlarmParams[]{
				new AlarmParams(10, 20, AlarmSeverity.WARN),
				new AlarmParams(50, 20, AlarmSeverity.CRIT)
			};
			networkCnDown = new AlarmParams[]{
				new AlarmParams(50, 20, AlarmSeverity.WARN),
				new AlarmParams(75, 20, AlarmSeverity.CRIT)
			};
			nodeDnDown = new AlarmParams[]{
				new AlarmParams(null, 1440, AlarmSeverity.WARN),
				new AlarmParams(null, 2880, AlarmSeverity.CRIT)
			};
			nodePopPrimaryDown = new AlarmParams[]{
				new AlarmParams(null, 120, AlarmSeverity.WARN),
				new AlarmParams(null, 1440, AlarmSeverity.CRIT)
			};
			linkDn2DnDown = new AlarmParams[]{
				new AlarmParams(null, 1440, AlarmSeverity.WARN),
				new AlarmParams(null, 2880, AlarmSeverity.CRIT)
			};
			primaryControllerDown = new AlarmParams[]{
				new AlarmParams(null, 5, AlarmSeverity.WARN),
				new AlarmParams(null, 120, AlarmSeverity.CRIT)
			};
		}
	}

	/** The system configuration. */
	public SystemConfig systemConfig = new SystemConfig();

	/** The syslog configuration. */
	public SyslogConfig syslogConfig = new SyslogConfig();

	/** The alarm configuration. */
	public AlarmConfig alarmConfig = new AlarmConfig();

	/**
	 * Serializes the Config object to the given file.
	 * @param f The file to write the serialized Config object to
	 * @throws IOException
	 */
	public void writeToFile(File f) throws IOException {
		try (BufferedWriter writer = new BufferedWriter(new FileWriter(f))) {
			writer.append(new GsonBuilder().setPrettyPrinting().create().toJson(this));
		}
	}

	/**
	 * Deserializes the Config object from the given file.
	 * @param f The file holding the serialized Config object
	 * @return The deserialized Config object
	 * @throws IOException
	 */
	public static Config readFromFile(File f) throws IOException {
		try (BufferedReader reader = new BufferedReader(new FileReader(f))) {
    		return new Gson().fromJson(reader, Config.class);
		}
	}
}
