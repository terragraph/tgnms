/*
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.alarms;

import com.google.gson.Gson;

/**
 * A thin version of the {@code thrift::Topology} structure.
 */
public class Topology {
	/** Node structure. */
	public static class Node {
		public String name;
		public int node_type;
		public boolean is_primary;
		public boolean pop_node;
		public int status;

		/** Returns whether this node is alive. */
		public boolean isAlive() {
			return (status == NodeStatusType.ONLINE.value() ||
					status == NodeStatusType.ONLINE_INITIATOR.value());
		}

		/** Returns whether this node is a DN. */
		public boolean isDN() { return (node_type == NodeType.DN.value()); }

		/** Returns whether this node is a CN. */
		public boolean isCN() { return (node_type == NodeType.CN.value()); }
	}

	/** Link structure. */
	public static class Link {
		public String name;
		public String a_node_name;
		public String z_node_name;
		public int link_type;
		public boolean is_alive;

		/** Returns whether this is a wireless link. */
		public boolean isWireless() { return (link_type == LinkType.WIRELESS.value()); }

		/** Returns whether this is a wired link. */
		public boolean isWired() { return (link_type == LinkType.ETHERNET.value()); }
	}

	/** Node types. */
	public enum NodeType {
		CN(1),
		DN(2);

		private final int id;
		NodeType(int id) { this.id = id; }
		public int value() { return id; }
	}

	/** Node statuses. */
	enum NodeStatusType {
	    OFFLINE(1),
	    ONLINE(2),
	    ONLINE_INITIATOR(3);

		private final int id;
		NodeStatusType(int id) { this.id = id; }
		public int value() { return id; }
	}

	/** Link types. */
	public enum LinkType {
		WIRELESS(1),
		ETHERNET(2);

		private final int id;
		LinkType(int id) { this.id = id; }
		public int value() { return id; }
	}

	/** The topology name. */
	public String name;

	/** The list of nodes. */
	public Node[] nodes;

	/** The list of links. */
	public Link[] links;

	/**
	 * Deserializes the Topology object from the given JSON string.
	 * @param json The JSON string holding the serialized Topology object
	 * @return The deserialized Topology object
	 */
	public static Topology fromJson(String json) {
		return new Gson().fromJson(json, Topology.class);
	}
}
