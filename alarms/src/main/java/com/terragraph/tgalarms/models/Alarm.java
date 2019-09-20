/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.models;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.google.gson.Gson;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Alarm structure.
 */
public class Alarm {
	/** Alarm severity levels. */
	public enum AlarmSeverity {
		OFF, INFO, MINOR, MAJOR, CRITICAL;
	}

	/** Alarm types. */
	public enum AlarmType {
		/** A regular alarm. */
		NORMAL,

		/** A hidden alarm for internal use only, e.g. sub-alarms for "aggregation" alarms. */
		HIDDEN,

		/** An aggregation alarm. */
		AGGREGATION;
	}

	/** The unique alarm ID. */
	private final String id;

	/** The alarm creation time (UNIX time). */
	private final long creationTime;

	/** The name of the alarm rule. */
	private final String ruleName;

	/** The alarm severity. */
	private AlarmSeverity severity;

	/** The entity attached to this alarm (if any). */
	private String entity;

	/** The alarm type. */
	private AlarmType alarmType;

	/** The events associated with this alarm. */
	private List<Event> events = new ArrayList<>(); // TODO limit list size?

	/** Create a new alarm. */
	public Alarm(String ruleName, AlarmSeverity severity, String entity) {
		this(ruleName, severity, entity, AlarmType.NORMAL);
	}

	/** Create a new alarm. */
	public Alarm(String ruleName, AlarmSeverity severity, String entity, AlarmType alarmType) {
		this.id = UUID.randomUUID().toString();
		this.creationTime = System.currentTimeMillis() / 1000;
		this.ruleName = ruleName;
		this.severity = severity;
		this.entity = entity;
		this.alarmType = alarmType;
	}

	/** Copy constructor. */
	public Alarm(Alarm other) {
		this.id = other.id;
		this.creationTime = other.creationTime;
		this.ruleName = other.ruleName;
		this.severity = other.severity;
		this.entity = other.entity;
		this.alarmType = other.alarmType;
		other.events.forEach(e -> events.add(new Event(e)));
	}

	/** Return the unique alarm ID. */
	public String getId() { return id; }

	/** Return the alarm creation time (UNIX time). */
	public long getCreationTime() { return creationTime; }

	/** Return the name of the alarm rule. */
	public String getRuleName() { return ruleName; }

	/** Return the alarm severity. */
	public AlarmSeverity getSeverity() { return severity; }

	/** Return the entity attached to this alarm (if any). */
	public String getEntity() { return entity; }

	/** Return the alarm type. */
	public AlarmType getAlarmType() { return alarmType; }

	/**
	 * Return the events associated with this alarm.
	 * @return the list of events (deep copy)
	 */
	public List<Event> getEvents() {
		return events.stream().map(event -> new Event(event)).collect(Collectors.toList());
	}

	/** Add an associated event to this alarm. */
	public void addEvent(Event event) {
		events.add(event);
	}

	/** Add associated events to this alarm. */
	public void addEvents(Collection<Event> eventList) {
		events.addAll(eventList);
	}

	/** Update the alarm severity. */
	public void updateSeverity(AlarmSeverity severity) {
		this.severity = severity;
	}

	/** Return whether this is an active alarm. */
	@Hidden
	public boolean isActive() { return severity != AlarmSeverity.OFF; }

	/** Return whether this is a "hidden" alarm (e.g. sub-alarms for "aggregation" alarms). */
	@Hidden
	public boolean isHidden() { return alarmType == AlarmType.HIDDEN; }

	/** Return whether this is an "aggregation" alarm. */
	@Hidden
	public boolean isAggregation() { return alarmType == AlarmType.AGGREGATION; }

	@Override
	public String toString() {
		return new Gson().toJson(this);
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + ((alarmType == null) ? 0 : alarmType.hashCode());
		result = prime * result + (int) (creationTime ^ (creationTime >>> 32));
		result = prime * result + ((entity == null) ? 0 : entity.hashCode());
		result = prime * result + ((events == null) ? 0 : events.hashCode());
		result = prime * result + ((id == null) ? 0 : id.hashCode());
		result = prime * result + ((ruleName == null) ? 0 : ruleName.hashCode());
		result = prime * result + ((severity == null) ? 0 : severity.hashCode());
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
		Alarm other = (Alarm) obj;
		if (alarmType != other.alarmType)
			return false;
		if (creationTime != other.creationTime)
			return false;
		if (entity == null) {
			if (other.entity != null)
				return false;
		} else if (!entity.equals(other.entity))
			return false;
		if (events == null) {
			if (other.events != null)
				return false;
		} else if (!events.equals(other.events))
			return false;
		if (id == null) {
			if (other.id != null)
				return false;
		} else if (!id.equals(other.id))
			return false;
		if (ruleName == null) {
			if (other.ruleName != null)
				return false;
		} else if (!ruleName.equals(other.ruleName))
			return false;
		if (severity != other.severity)
			return false;
		return true;
	}
}
