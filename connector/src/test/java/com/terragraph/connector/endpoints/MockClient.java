/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import java.util.ArrayList;
import java.util.List;

import com.terragraph.connector.endpoints.Client;

public class MockClient<T> implements Client<T> {
	/** The current queue. */
	private final List<T> queue = new ArrayList<>();

	/** The submitted entries. */
	private final List<T> submitted = new ArrayList<>();

	@Override
	public void enqueue(T entry) {
		queue.add(entry);
	}

	@Override
	public int queueSize() {
		return queue.size();
	}

	@Override
	public boolean shouldSubmit() {
		return !queue.isEmpty();
	}

	@Override
	public boolean submit() {
		submitted.addAll(queue);
		queue.clear();
		return true;
	}

	@Override
	public void init() {}

	@Override
	public void close() {}

	/** Returns the current queue. */
	public List<T> getQueue() { return queue; }

	/** Returns the submitted entries. */
	public List<T> getSubmitted() { return submitted; }
}
