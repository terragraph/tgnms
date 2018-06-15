/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import java.io.File;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main launcher class.
 */
public class Launcher {
    private static final Logger logger = LoggerFactory.getLogger(Launcher.class);

    /** The default config file ({@code config.json}). */
    private static final File DEFAULT_CONFIG_FILE = new File("config.json");

    /** The default serialized alarm data file ({@code data.ser}). */
    private static final File DEFAULT_ALARM_DATA_FILE = new File("data.ser");

    /**
     * Start the alarm poller.
     * <p>
     * By default, the configuration file is read from {@link #DEFAULT_CONFIG_FILE}, which is automatically created if
     * it does not exist. This program accepts a single optional argument which specifies an alternate location for the
     * configuration file.
     *
     * @throws Exception
     */
    public static void main(String[] args) throws Exception {
        // Read the given config file, or initialize a default config
        Config config;
        if (args.length >= 1) {
            // Try to read the given file
            logger.info("Loading config file: {}", args[0]);
            config = Config.readFromFile(new File(args[0]));
        } else {
            // Check if the default config exists
            if (DEFAULT_CONFIG_FILE.isFile()) {
                logger.info("Loading config file: {}", DEFAULT_CONFIG_FILE.getAbsolutePath());
                config = Config.readFromFile(DEFAULT_CONFIG_FILE);
            } else {
                // Create and write a default config
                logger.info("Creating config file: {}", DEFAULT_CONFIG_FILE.getAbsolutePath());
                config = new Config();
                config.writeToFile(DEFAULT_CONFIG_FILE);
            }
        }

        // Read the given alarm data file (if any)
        File alarmDataFile = null;
        AlarmData alarmData = null;
        if (args.length >= 2) {
            // Try to read the given serialized alarm data
            logger.info("Loading serialized alarm data file: {}", args[1]);
            alarmDataFile = new File(args[1]);
            alarmData = AlarmData.readFromFile(alarmDataFile, config.alarmConfig);
        } else {
            // Read the default serialized alarm data file (if it exists)
            alarmDataFile = DEFAULT_ALARM_DATA_FILE;
            if (alarmDataFile.isFile()) {
                logger.info("Loading serialized alarm data file: {}", alarmDataFile.getAbsolutePath());
                alarmData = AlarmData.readFromFile(alarmDataFile, config.alarmConfig);
            }
        }

        // Start the alarm poller
        AlarmPoller alarmPoller = new AlarmPoller(config, alarmData);
        alarmPoller.addShutdownHook(alarmDataFile);
        alarmPoller.start();
    }
}
