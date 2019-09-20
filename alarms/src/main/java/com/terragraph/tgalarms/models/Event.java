/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.models;

import java.util.Arrays;

import org.json.JSONException;
import org.json.JSONObject;

import com.google.gson.Gson;

import io.swagger.v3.oas.annotations.Hidden;

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

	/** Construct an empty event. */
	public Event() {}

	/** Construct an event with the given fields. */
	public Event(int eventId, String entity, EventLevel level) {
		this.timestamp = System.currentTimeMillis() / 1000;
		this.eventId = eventId;
		this.entity = entity;
		this.level = level.getId();
	}

	/** Copy constructor. */
	public Event(Event other) {
		this.source = other.source;
		this.timestamp = other.timestamp;
		this.reason = other.reason;
		this.details = other.details;
		this.category = other.category;
		this.level = other.level;
		this.entity = other.entity;
		this.nodeId = other.nodeId;
		this.eventId = other.eventId;
	}

	/** Return the event level as an enum. */
	public EventLevel getLevel() {
		return EventLevel.fromId(level);
	}

	/** Return the event ID as an enum. */
	public EventId getEventId() {
		return EventId.fromId(eventId);
	}

	/** Return the "details" field as a JSON object, or null if invalid. */
	@Hidden
	public JSONObject getDetailsJson() {
		try {
			return details.isEmpty() ? null : new JSONObject(details);
		} catch (JSONException e) {
			return null;
		}
	}

	/** Event levels (see thrift::EventLevel). */
	public enum EventLevel {
		INFO (10), WARNING (20), ERROR (30), FATAL (40);

		private final int id;
		EventLevel(int id) { this.id = id; }
		public int getId() { return id; }
		public static EventLevel fromId(int id) {
			return Arrays.stream(EventLevel.values()).filter(level -> level.getId() == id).findFirst().orElse(null);
		}
	}

	/** Event IDs (see thrift::EventId). Only added as necessary. */
	public enum EventId {
		DRIVER_LINK_STATUS (103),
		UPGRADE_PREPARE (301),
		UPGRADE_COMMIT (302),
		MINION_SET_CONFIG (503),
		NODE_STATUS (701),
		LINK_STATUS (702),
		GPS_SYNC (703),
		DRIVER_DEVICE_STATUS (802);

		private final int id;
		EventId(int id) { this.id = id; }
		public int getId() { return id; }
		public static EventId fromId(int id) {
			return Arrays.stream(EventId.values()).filter(level -> level.getId() == id).findFirst().orElse(null);
		}
	}

	@Override
	public String toString() {
		return new Gson().toJson(this);
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + category;
		result = prime * result + ((details == null) ? 0 : details.hashCode());
		result = prime * result + ((entity == null) ? 0 : entity.hashCode());
		result = prime * result + eventId;
		result = prime * result + level;
		result = prime * result + ((nodeId == null) ? 0 : nodeId.hashCode());
		result = prime * result + ((reason == null) ? 0 : reason.hashCode());
		result = prime * result + ((source == null) ? 0 : source.hashCode());
		result = prime * result + (int) (timestamp ^ (timestamp >>> 32));
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		Event other = (Event) obj;
		if (category != other.category)
			return false;
		if (details == null) {
			if (other.details != null)
				return false;
		} else if (!details.equals(other.details))
			return false;
		if (entity == null) {
			if (other.entity != null)
				return false;
		} else if (!entity.equals(other.entity))
			return false;
		if (eventId != other.eventId)
			return false;
		if (level != other.level)
			return false;
		if (nodeId == null) {
			if (other.nodeId != null)
				return false;
		} else if (!nodeId.equals(other.nodeId))
			return false;
		if (reason == null) {
			if (other.reason != null)
				return false;
		} else if (!reason.equals(other.reason))
			return false;
		if (source == null) {
			if (other.source != null)
				return false;
		} else if (!source.equals(other.source))
			return false;
		if (timestamp != other.timestamp)
			return false;
		return true;
	}
}
