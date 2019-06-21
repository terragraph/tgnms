/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.models;

/**
 * Event structure (see thrift::Event).
 */
public class Event {
	public String source;
	public long timestamp;
	public String reason;
	public String details;
	public int category;
	public int level;
	public String entity;
	public String nodeId;
	public int eventId;
	public String topologyName;
}
