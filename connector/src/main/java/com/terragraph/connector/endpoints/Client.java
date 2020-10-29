/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.connector.endpoints;

/**
 * Interface for clients to queue and submit data.
 *
 * @param <T> the input data type
 */
public interface Client<T> {
	/** Enqueue an entry. */
	public void enqueue(T entry);

	/** Returns the current queue size. */
	public int queueSize();

	/** Returns whether entries should be submitted now. */
	public boolean shouldSubmit();

	/** Submit queued entries. */
	public boolean submit();

	/** Initialize resources. */
	public void init();

	/** Clean up resources. */
	public void close();
}
