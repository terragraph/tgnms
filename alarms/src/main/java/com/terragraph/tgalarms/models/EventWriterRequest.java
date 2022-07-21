/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
