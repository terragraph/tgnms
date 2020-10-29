/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.serdes;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.apache.kafka.common.serialization.Deserializer;

import com.google.gson.Gson;

/**
 * Generic JSON deserializer.
 */
public class JsonDeserializer<T> implements Deserializer<T> {
	/** The JSON serializer. */
	private final Gson gson = new Gson();

	/** The generic class. */
	private final Class<T> clazz;

	public JsonDeserializer(Class<T> clazz) {
		this.clazz = clazz;
	}

	@Override
	public void configure(Map<String, ?> configs, boolean isKey) {}

	@Override
	public T deserialize(String topic, byte[] data) {
		return data != null ? gson.fromJson(new String(data, StandardCharsets.UTF_8), clazz) : null;
	}

	@Override
	public void close() {}
}
