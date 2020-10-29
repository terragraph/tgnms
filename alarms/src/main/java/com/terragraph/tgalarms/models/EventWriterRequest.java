/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.models;

/**
 * Events writer request structure.
 */
public class EventWriterRequest {
	public class TopologyEntry {
		public String name;
	}

	public class AgentEntry {
		public String mac;
		public String name;
		public String site;
		public Event[] events;
	}

	public TopologyEntry topology;
	public AgentEntry[] agents;
}
