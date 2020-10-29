/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.models;

import org.json.JSONObject;

/**
 * Topology configuration structure (see query::TopologyConfig).
 */
public class TopologyConfig {
	public static class ControllerConfig {
		public String ip;
		public int api_port;
	}
	public int id;
	public String name;
	public ControllerConfig primary_controller;
	public ControllerConfig backup_controller;
	public JSONObject topology;  // TODO import Topology.thrift?
//	public Map<String, Long> keys;
//	public WirelessController wireless_controller;
}
