/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/**
 * Abstract base class for clients to queue and submit data.
 *
 * @param <T> the input data type
 * @param <E> the queued data type
 */
public abstract class ClientBase<T, E> implements Client<T> {
	/** Minimum request batch size. */
	private final int minBatchSize;

	/** The maximum interval (in ms) before sending queued entries. */
	private final int maxQueueIntervalMs;

	/** The current queue. */
	private List<E> queue = new ArrayList<>();

	/** The timestamp when the first queue entry was received. */
	private long queueStartTs;

	/** Constructor. */
	public ClientBase(int minBatchSize, int maxQueueIntervalMs) {
		this.minBatchSize = minBatchSize;
		this.maxQueueIntervalMs = maxQueueIntervalMs;
	}

	@Override
	public synchronized void enqueue(T entry) {
		if (queue.isEmpty()) {
			queueStartTs = System.currentTimeMillis();
		}
		queue.add(translate(entry));
	}

	@Override
	public int queueSize() {
		return queue.size();
	}

	@Override
	public boolean shouldSubmit() {
		return (
			queue.size() >= minBatchSize ||
			(!queue.isEmpty() && System.currentTimeMillis() - queueStartTs >= maxQueueIntervalMs)
		);
	}

	@Override
	public synchronized boolean submit() {
		if (queue.isEmpty()) {
			return false;
		}

		// Try to submit entries
		if (!submit(queue)) {
			return false;
		}

		// Reset state
		queue.clear();
		queueStartTs = 0;
		return true;
	}

	@Override
	public void init() {}

	@Override
	public void close() {}

	/** Convert an input entry to a queue entry. */
	protected abstract E translate(T entry);

	/** Submit the current queue of entries. Returns true upon success (clears the queue), and false upon errors. */
	protected abstract boolean submit(List<E> queue);

	/** Send a POST request to the given URL. */
	protected String sendPostRequest(URL url, String postData, String contentType) throws IOException {
		return HttpUtils.sendPostRequest(url, postData, contentType);
	}
}
