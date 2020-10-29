/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.kafka.serdes;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.apache.kafka.common.serialization.Serializer;

import com.google.gson.Gson;

/**
 * Generic JSON serializer.
 */
public class JsonSerializer<T> implements Serializer<T> {
	/** The JSON serializer. */
	private final Gson gson = new Gson();

	@Override
	public void configure(Map<String, ?> configs, boolean isKey) {}

	@Override
	public byte[] serialize(String topic, T data) {
		return gson.toJson(data).getBytes(StandardCharsets.UTF_8);
	}

	@Override
	public void close() {}
}
