/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms.models;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.json.JSONObject;
import org.json.JSONPointer;
import org.json.JSONPointerException;

import com.google.gson.Gson;
import com.terragraph.tgalarms.AlarmService.AlarmAction;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.Event.EventLevel;

/**
 * Alarm rule definition.
 */
public class AlarmRule {
	/** The unique alarm rule name. */
	private String name;

	/** The text description of the alarm rule. */
	private String description;

	/** The event ID triggering these alarms. */
	private int eventId;

	/** The alarm severity. */
	private AlarmSeverity severity;

	/** Additional alarm options. */
	private AlarmRuleOptions options;

	/** Alarm rule options. */
	public static class AlarmRuleOptions {
		/** The event levels at which a corresponding alarm should be raised. */
		private Set<EventLevel> raiseOnLevel;

		/** The event levels at which a corresponding alarm should be cleared. */
		private Set<EventLevel> clearOnLevel;

		/** The delay before raising an alarm (in seconds). */
		private int raiseDelay = 0;

		/** The delay before clearing an alarm (in seconds). */
		private int clearDelay = 0;

		/** The minimum number of different entities which must match this rule before an alarm is raised. */
		private int aggregation = 0;

		/** The set of entities that this rule applies to. */
		private Set<String> entityFilter;

		/** The set of attribute filters on which to apply this rule (must match any, not all). */
		public Set<Map<String, Object>> attributeFilter;

		/** Return the event levels at which a corresponding alarm should be raised. */
		public Set<EventLevel> getRaiseOnLevel() { return raiseOnLevel; }

		/** Return the event levels at which a corresponding alarm should be cleared. */
		public Set<EventLevel> getClearOnLevel() { return clearOnLevel; }

		/**
		 * Return the delay before raising an alarm.
		 * @return the delay (in seconds), or 0 if disabled
		 */
		public int getRaiseDelay() { return raiseDelay; }

		/**
		 * Return the delay before clearing an alarm.
		 * @return the delay (in seconds), or 0 if disabled
		 */
		public int getClearDelay() { return clearDelay; }

		/**
		 * Return the minimum number of different entities which must match this rule before an alarm is raised.
		 * @return the aggregation level, or 0 if disabled
		 */
		public int getAggregation() { return aggregation; }

		/**
		 * Return the set of entities that this rule applies to.
		 * @return the entities, or an empty set if disabled
		 */
		public Set<String> getEntityFilter() { return entityFilter; }

		/**
		 * Return the set of attribute filters on which to apply this rule (must match any, not all).
		 * @return the attribute filters, or an empty set if disabled
		 */
		public Set<Map<String, Object>> getAttributeFilter() { return attributeFilter; }

		@Override
		public int hashCode() {
			final int prime = 31;
			int result = 1;
			result = prime * result + aggregation;
			result = prime * result + ((attributeFilter == null) ? 0 : attributeFilter.hashCode());
			result = prime * result + clearDelay;
			result = prime * result + ((clearOnLevel == null) ? 0 : clearOnLevel.hashCode());
			result = prime * result + ((entityFilter == null) ? 0 : entityFilter.hashCode());
			result = prime * result + raiseDelay;
			result = prime * result + ((raiseOnLevel == null) ? 0 : raiseOnLevel.hashCode());
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
			AlarmRuleOptions other = (AlarmRuleOptions) obj;
			if (aggregation != other.aggregation)
				return false;
			if (attributeFilter == null) {
				if (other.attributeFilter != null)
					return false;
			} else if (!attributeFilter.equals(other.attributeFilter))
				return false;
			if (clearDelay != other.clearDelay)
				return false;
			if (clearOnLevel == null) {
				if (other.clearOnLevel != null)
					return false;
			} else if (!clearOnLevel.equals(other.clearOnLevel))
				return false;
			if (entityFilter == null) {
				if (other.entityFilter != null)
					return false;
			} else if (!entityFilter.equals(other.entityFilter))
				return false;
			if (raiseDelay != other.raiseDelay)
				return false;
			if (raiseOnLevel == null) {
				if (other.raiseOnLevel != null)
					return false;
			} else if (!raiseOnLevel.equals(other.raiseOnLevel))
				return false;
			return true;
		}

		/** Builder class. */
		public static class Builder {
			private AlarmRuleOptions opts = new AlarmRuleOptions();
			public Builder setRaiseOnLevel(Set<EventLevel> raiseOnLevel) {
				opts.raiseOnLevel = raiseOnLevel;
				return this;
			}
			public Builder setClearOnLevel(Set<EventLevel> clearOnLevel) {
				opts.clearOnLevel = clearOnLevel;
				return this;
			}
			public Builder setRaiseDelay(int raiseDelay) {
				opts.raiseDelay = raiseDelay;
				return this;
			}
			public Builder setClearDelay(int clearDelay) {
				opts.clearDelay = clearDelay;
				return this;
			}
			public Builder setAggregation(int aggregation) {
				opts.aggregation = aggregation;
				return this;
			}
			public Builder setEntityFilter(Set<String> entityFilter) {
				opts.entityFilter = entityFilter;
				return this;
			}
			public Builder setAttributeFilter(Set<Map<String, Object>> attributeFilter) {
				opts.attributeFilter = attributeFilter;
				return this;
			}
			public AlarmRuleOptions build() {
				// Set default values
				if (opts.raiseOnLevel == null) {
					opts.raiseOnLevel = new HashSet<>();
					opts.raiseOnLevel.add(EventLevel.WARNING);
					opts.raiseOnLevel.add(EventLevel.ERROR);
					opts.raiseOnLevel.add(EventLevel.FATAL);
				}
				if (opts.clearOnLevel == null) {
					opts.clearOnLevel = new HashSet<>();
					opts.clearOnLevel.add(EventLevel.INFO);
				}
				if (opts.entityFilter == null) {
					opts.entityFilter = new HashSet<>();
				}
				if (opts.attributeFilter == null) {
					opts.attributeFilter = new HashSet<>();
				}
				return opts;
			}
		}
	}


	/** Create an alarm rule with default options. */
	public AlarmRule(String name, String description, int eventId, AlarmSeverity severity) {
		this(name, description, eventId, severity, new AlarmRuleOptions.Builder().build());
	}

	/** Create an alarm rule with the given options. */
	public AlarmRule(String name, String description, int eventId, AlarmSeverity severity, AlarmRuleOptions opts) {
		this.name = name;
		this.description = description;
		this.eventId = eventId;
		this.severity = severity;
		this.options = opts;
	}

	/** Return the unique alarm rule name. */
	public String getName() { return name; }

	/** Return the text description of the alarm rule. */
	public String getDescription() { return description; }

	/** Return the event ID triggering these alarms. */
	public int getEventId() { return eventId; }

	/** Return the alarm severity. */
	public AlarmSeverity getSeverity() { return severity; }

	/** Return the additional alarm options. */
	public AlarmRuleOptions getOptions() { return options; }

	/** Return whether the rule matches the given event. */
	public boolean matchesEvent(Event event) {
		if (eventId != event.eventId) {
			return false;
		}
		if (
			options.entityFilter != null &&
			!options.entityFilter.isEmpty() &&
			!options.entityFilter.contains(event.entity)
		) {
			return false;
		}
		if (options.attributeFilter != null && !options.attributeFilter.isEmpty()) {
			JSONObject o = event.getDetailsJson();
			if (!options.attributeFilter.stream().anyMatch(filter -> this.matchesAttributeFilter(filter, o))) {
				return false;
			}
		}
		return true;
	}

	/** Return whether the given object matches a filter, containing a map of JSON pointers to expected values. */
	private boolean matchesAttributeFilter(Map<String, Object> filter, JSONObject o) {
		for (Map.Entry<String, Object> entry : filter.entrySet()) {
			JSONPointer pointer = new JSONPointer(entry.getKey());
			try {
				Object queryVal = pointer.queryFrom(o);
				if (queryVal == null || !queryVal.equals(entry.getValue())) {
					return false;
				}
			} catch (JSONPointerException e) {
				return false;
			}
		}
		return true;
	}

	/** Return the action to take for the given event. */
	public AlarmAction getActionOnEvent(Event event) {
		if (options.raiseOnLevel.contains(event.getLevel())) {
			return AlarmAction.RAISE;
		} else if (options.clearOnLevel.contains(event.getLevel())) {
			return AlarmAction.CLEAR;
		} else {
			return AlarmAction.NONE;
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
		result = prime * result + ((description == null) ? 0 : description.hashCode());
		result = prime * result + eventId;
		result = prime * result + ((name == null) ? 0 : name.hashCode());
		result = prime * result + ((options == null) ? 0 : options.hashCode());
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
		AlarmRule other = (AlarmRule) obj;
		if (description == null) {
			if (other.description != null)
				return false;
		} else if (!description.equals(other.description))
			return false;
		if (eventId != other.eventId)
			return false;
		if (name == null) {
			if (other.name != null)
				return false;
		} else if (!name.equals(other.name))
			return false;
		if (options == null) {
			if (other.options != null)
				return false;
		} else if (!options.equals(other.options))
			return false;
		if (severity != other.severity)
			return false;
		return true;
	}
}
