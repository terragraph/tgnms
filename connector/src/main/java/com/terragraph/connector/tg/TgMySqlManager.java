/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.tg;

import java.io.Closeable;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.connector.models.Event;
import com.terragraph.connector.models.TopologyConfig;

/**
 * MySQL connection manager and utilities for Terragraph's database.
 *
 * This uses a single connection and is NOT thread-safe.
 */
public class TgMySqlManager implements Closeable {
	private static final Logger logger = LoggerFactory.getLogger(TgMySqlManager.class);

	/** The JDBC connection. */
	private Connection connection;

	/** Load the JDBC driver and open a connection. */
	public TgMySqlManager(String host, int port, String db, String username, String password)
		throws InstantiationException, IllegalAccessException, ClassNotFoundException, SQLException {
		// Load the JDBC driver
        Class.forName("com.mysql.cj.jdbc.Driver").newInstance();

        // Create a connection
		String connectionUrl = String.format("jdbc:mysql://%s:%d/%s", host, port, db);
		logger.info("Establishing MySQL connection: {}", connectionUrl);
		connection = DriverManager.getConnection(connectionUrl, username, password);
		connection.setAutoCommit(false);
	}

	/** Fetch the topology list. */
	public List<TopologyConfig> fetchTopologies() {
		String sql =
	        "SELECT " +
		        "t.id, " +
		        "t.name, " +
		        "cp.api_ip AS `p_ip`, " +
		        "cp.api_port AS `p_api_port`, " +
		        "cb.api_ip AS `b_ip`, " +
		        "cb.api_port AS `b_api_port`, " +
		        "wc.type AS `wac_type`, " +
		        "wc.url AS `wac_url`, " +
		        "wc.username AS `wac_username`, " +
		        "wc.password AS `wac_password` " +
	        "FROM topology t " +
	        "JOIN (controller cp) ON (t.primary_controller = cp.id) " +
	        "LEFT JOIN (controller cb) ON (t.backup_controller = cb.id) " +
	        "LEFT JOIN (wireless_controller wc) ON (t.wireless_controller = wc.id)";
		try (
			Statement stmt = connection.createStatement();
			ResultSet rs = stmt.executeQuery(sql);
		) {
			List<TopologyConfig> result = new ArrayList<>();
			while (rs.next()) {
				TopologyConfig config = new TopologyConfig();
				config.id = rs.getInt("id");
				config.name = rs.getString("name");
				config.primary_controller = new TopologyConfig.ControllerConfig();
				config.primary_controller.ip = rs.getString("p_ip");
				config.primary_controller.api_port = rs.getInt("p_api_port");
				if (!rs.getString("b_ip").isEmpty()) {
					config.backup_controller = new TopologyConfig.ControllerConfig();
					config.backup_controller.ip = rs.getString("b_ip");
					config.backup_controller.api_port = rs.getInt("b_api_port");
				}
				result.add(config);
			}
			return result;
		} catch (SQLException e) {
			logger.error("Error fetching topologies.", e);
			return null;
		}
	}

	/** Write the given list of events. */
	public boolean writeEvents(
		List<Event> events,
		Map<String, String> macToTopologyMap,
		Map<String, String> topologyNameMap
	) {
		String sql =
			"INSERT INTO `events` (" +
				"`timestamp`, `topologyName`, `nodeId`, `entity`, `source`, " +
				"`level`, `category`, `eventId`, `reason`, `details`" +
			") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
		try (PreparedStatement stmt = connection.prepareStatement(sql)) {
			for (Event event : events) {
				String topologyName = null;
				if (event.topologyName != null && topologyNameMap.containsKey(event.topologyName)) {
					topologyName = topologyNameMap.get(event.topologyName);
				} else if (event.nodeId != null && !event.nodeId.isEmpty()) {
					topologyName = macToTopologyMap.get(event.nodeId);
				}
				stmt.setLong(1, event.timestamp);
				stmt.setString(2, topologyName);
				stmt.setString(3, event.nodeId);
				stmt.setString(4, event.entity);
				stmt.setString(5, event.source);
				stmt.setInt(6, event.level);
				stmt.setInt(7, event.category);
				stmt.setInt(8, event.eventId);
				stmt.setString(9, event.reason);
				stmt.setString(10, event.details);
				stmt.addBatch();
			}
			int[] res = stmt.executeBatch();
			if (Arrays.stream(res).anyMatch(status -> status < 0)) {
				logger.error("MySQL execution error.");
				connection.rollback();
				return false;
			}
			connection.commit();
			return true;
		} catch (SQLException e) {
			logger.error("Error writing events.", e);
			return false;
		}
	}

	@Override
	public void close() throws IOException {
		try {
			connection.close();
		} catch (SQLException e) {
			throw new IOException(e.getMessage());
		}
	}
}
