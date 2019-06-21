/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.models;

/**
 * Stat structure (see thrift::AggrStat).
 */
public class AggrStat {
	public String key;
	public long timestamp;
	public double value;
	public boolean isCounter;
	public String entity;

	public AggrStat(String key, long timestamp, double value, boolean isCounter, String entity) {
		this.key = key;
		this.timestamp = timestamp;
		this.value = value;
		this.isCounter = isCounter;
		this.entity = entity;
	}
}
