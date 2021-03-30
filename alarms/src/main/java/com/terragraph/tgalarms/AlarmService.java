/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.Alarm.AlarmType;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.Event;

/**
 * Service for generating alarms from an events stream.
 */
public class AlarmService {
	private static final Logger logger = LoggerFactory.getLogger(AlarmService.class);

	/** Alarm actions. */
	public enum AlarmAction { NONE, RAISE, CLEAR, RULE_DELETED }

	/** All active alarms, keyed by alarm rule name. */
	private Map<String /* rule name */, List<Alarm>> alarms = new HashMap<>();

	/** All defined alarm rules, keyed by name. */
	private Map<String /* name */, AlarmRule> alarmRules = new HashMap<>();

	/** The alarm rules file (if any). */
	private File alarmRulesFile;

	/** Scheduled alarms (for delayed RAISE/CLEAR rules). */
	private Map<String /* rule name */, Map<String /* entity */, PendingAlarmAction>> pendingAlarmsActions =
		new HashMap<>();

	/** Pending alarm action. */
	private class PendingAlarmAction {
		/** The pending alarm. */
		public Alarm alarm;

		/** The pending action. */
		public AlarmAction action;

		/** The future (scheduled via {@link #scheduledExecutor}). */
		public Future<?> future;

		/** Constructor. */
		public PendingAlarmAction(Alarm alarm, AlarmAction action) {
			this.alarm = alarm;
			this.action = action;
		}
	}

	/** Pending alarm action task. */
	private class PendingAlarmActionTask implements Runnable {
		private final AlarmRule rule;
		private final String entity;

		/** Constructor. */
		public PendingAlarmActionTask(AlarmRule rule, String entity) {
			this.rule = rule;
			this.entity = entity;
		}

		@Override
		public void run() {
			synchronized (AlarmService.this) {
				// Raise or clear an alarm
				PendingAlarmAction pendingAlarm = getPendingAlarmAction(rule, entity);
				if (pendingAlarm != null) {
					if (pendingAlarm.action == AlarmAction.RAISE) {
						raiseAlarm(rule, pendingAlarm.alarm);
					} else if (pendingAlarm.action == AlarmAction.CLEAR) {
						clearAlarm(rule, pendingAlarm.alarm);
					}
				}
			}
		}
	}

	/** Scheduler for delayed alarm actions. */
	private ScheduledExecutorService scheduledExecutor;

	/** Listeners for alarm changes. */
	private List<AlarmListener> alarmListeners = new ArrayList<>();

	/* ------------
	 * Constructors
	 * ------------ */

	/** Initialize the alarms service from the given events source. */
	public AlarmService() {
		this.scheduledExecutor = Executors.newSingleThreadScheduledExecutor();
		addShutdownHook();
	}

	/** Initialize the alarms service using the given ScheduledExecutorService. */
	public AlarmService(ScheduledExecutorService scheduledExecutor) {
		this.scheduledExecutor = scheduledExecutor;
		addShutdownHook();
	}

	/** Shutdown hook to clean up executors. */
	private void addShutdownHook() {
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			if (scheduledExecutor != null && !scheduledExecutor.isShutdown()) {
				scheduledExecutor.shutdownNow();
				scheduledExecutor = null;
			}
		}));
	}

	/* ----------------
	 * Event Processing
	 * ---------------- */

	/** Process an event. */
	public synchronized void processEvent(Event event) {
		logger.debug("Processing event: {}", event);

		// Find all rules for this event ID
		List<AlarmRule> rules = getAlarmRules(event);
		for (AlarmRule rule : rules) {
			boolean isAggregationRule = rule.getOptions().getAggregation() > 0;

			// Determine the action for this event
			AlarmAction action = rule.getActionOnEvent(event);

			// Get the pending alarm action, if any (i.e. delayed RAISE/CLEAR)
			PendingAlarmAction pendingAlarmAction = getPendingAlarmAction(rule, event.entity);

			// Get current alarm that matches this rule/entity
			Alarm alarm = getMatchingAlarm(rule, event.entity);
			if (alarm == null) {
				// No alarm exists, so raise one
				if (action == AlarmAction.RAISE) {
					// Construct new alarm
					Alarm newAlarm = new Alarm(
						rule.getName(),
						rule.getSeverity(),
						event.entity,
						isAggregationRule ? AlarmType.HIDDEN : AlarmType.NORMAL
					);
					newAlarm.addEvent(event);

					// Check if there's already a pending action
					if (rule.getOptions().getRaiseDelay() > 0) {
						if (pendingAlarmAction != null && pendingAlarmAction.action == AlarmAction.RAISE) {
							// RAISE already scheduled - just add this event
							pendingAlarmAction.alarm.addEvent(event);
						} else {
							// Raise after delay
							pendingAlarmAction = new PendingAlarmAction(newAlarm, AlarmAction.RAISE);
							schedulePendingAlarmAction(
								rule, event.entity, pendingAlarmAction, rule.getOptions().getRaiseDelay()
							);
						}
					} else {
						// Raise immediately
						raiseAlarm(rule, newAlarm);
					}
				} else if (action == AlarmAction.CLEAR) {
					// If there's a pending RAISE, cancel it
					if (rule.getOptions().getRaiseDelay() > 0) {
						if (pendingAlarmAction != null && pendingAlarmAction.action == AlarmAction.RAISE) {
							cancelPendingAlarmAction(rule, event.entity);
						}
					}
				}
			} else {
				// Update existing alarm
				alarm.addEvent(event);
				if (action == AlarmAction.CLEAR) {
					// Check if there's already a pending action
					if (rule.getOptions().getClearDelay() > 0) {
						if (pendingAlarmAction != null && pendingAlarmAction.action == AlarmAction.CLEAR) {
							// CLEAR already scheduled - do nothing
						} else {
							// Clear after delay
							pendingAlarmAction = new PendingAlarmAction(alarm, AlarmAction.CLEAR);
							schedulePendingAlarmAction(
								rule, event.entity, pendingAlarmAction, rule.getOptions().getClearDelay()
							);
						}
					} else {
						// Clear immediately
						clearAlarm(rule, alarm);
					}
				} else {
					if (action == AlarmAction.RAISE) {
						// If there's a pending CLEAR, cancel it
						if (rule.getOptions().getClearDelay() > 0) {
							if (pendingAlarmAction != null && pendingAlarmAction.action == AlarmAction.CLEAR) {
								cancelPendingAlarmAction(rule, event.entity);
							}
						}
					}
					notifyListeners(alarm, AlarmAction.NONE);
				}
			}

			// Update aggregations
			updateAggregationAlarm(rule, event);
		}
	}

	/** Update the aggregation alarm (if necessary) for an event (if any). */
	private void updateAggregationAlarm(AlarmRule rule, Event event) {
		// Is this an aggregation rule?
		final int aggregationCount = rule.getOptions().getAggregation();
		if (aggregationCount <= 0) {
			return;
		}

		// Find the aggregation alarm and all sub-alarms (if any)
		List<Alarm> alarmsForRule = alarms.getOrDefault(rule.getName(), new ArrayList<>());
		Optional<Alarm> aggAlarm = alarmsForRule.stream().filter(Alarm::isAggregation).findFirst();
		List<Alarm> subAlarms = alarmsForRule.stream()
			.filter(x -> x.isActive() && x.isHidden())
			.collect(Collectors.toList());

		// Update the aggregation alarm accordingly
		if (subAlarms.size() >= rule.getOptions().getAggregation()) {
			if (aggAlarm.isPresent()) {
				// Update the aggregation alarm
				if (event != null) {
					aggAlarm.get().addEvent(event);
					notifyListeners(aggAlarm.get(), AlarmAction.NONE);
				}
			} else {
				// Raise an aggregation alarm
				Alarm newAlarm = new Alarm(rule.getName(), rule.getSeverity(), null, AlarmType.AGGREGATION);
				subAlarms.forEach(subAlarm -> newAlarm.addEvents(subAlarm.getEvents()));
				raiseAlarm(rule, newAlarm);
			}
		} else {
			if (aggAlarm.isPresent()) {
				// Clear the aggregation alarm
				if (event != null) {
					aggAlarm.get().addEvent(event);
				}
				clearAlarm(rule, aggAlarm.get());
			} else {
				// Do nothing
			}
		}
	}

	/* -----------
	 * Alarm Rules
	 * ----------- */

	/** Returns all existing alarm rules. */
	public Collection<AlarmRule> getAlarmRules() {
		return alarmRules.values();
	}

	/** Returns the alarm rule with the given name, or null if none. */
	public AlarmRule getAlarmRule(String name) {
		return alarmRules.get(name);
	}

	/** Returns all existing alarm rules applicable to the given event. */
	private List<AlarmRule> getAlarmRules(Event event) {
		return alarmRules.values().stream().filter(rule -> rule.matchesEvent(event)).collect(Collectors.toList());
	}

	/** Add a new alarm rule. */
	public synchronized boolean addAlarmRule(AlarmRule rule) {
		if (rule.getName() == null || rule.getName().trim().isEmpty()) {
			return false;
		}
		if (alarmRules.putIfAbsent(rule.getName(), rule) != null) {
			return false;
		}
		logger.info("Added alarm rule: {}", rule);

		trySaveAlarmRules();
		return true;
	}

	/** Delete the given alarm rule and all related alarms. */
	public synchronized boolean deleteAlarmRule(String name) {
		// Delete rule
		AlarmRule rule = alarmRules.remove(name);
		if (rule == null) {
			return false;
		}
		logger.info("Deleted alarm rule: {}", rule);

		// Delete all alarms for this rule
		List<Alarm> relatedAlarms = alarms.get(name);
		if (relatedAlarms != null) {
			logger.info("Deleting {} alarm(s) for rule: {}", relatedAlarms.size(), name);
			relatedAlarms.forEach(alarm -> {
				alarm.updateSeverity(AlarmSeverity.OFF);
				notifyListeners(alarm, AlarmAction.RULE_DELETED);
			});
			alarms.remove(name);
		}

		// Abort any scheduled alarm actions
		Map<String, PendingAlarmAction> pendingEntityActions = pendingAlarmsActions.get(name);
		if (pendingEntityActions != null) {
			logger.debug("Deleting {} pending action(s) for rule: {}", pendingEntityActions.size(), name);
			Set<String> entities = new HashSet<>(pendingEntityActions.keySet());
			entities.forEach(entity -> cancelPendingAlarmAction(rule, entity));
		}

		trySaveAlarmRules();
		return true;
	}

	/** Set a backing file for alarm rules. All rule modifications will be saved to this file. */
	public synchronized void setAlarmRulesFile(File f) {
		this.alarmRulesFile = f;
	}

	/** Load alarm rules (in JSON format), or the default rules if the file does not exist. */
	public synchronized void loadAlarmRules() throws FileNotFoundException, IOException {
		if (alarmRulesFile == null) {
			throw new NullPointerException("Alarm rules file is not set");
		}
		if (alarmRulesFile.isFile()) {
	        try (BufferedReader reader = new BufferedReader(new FileReader(alarmRulesFile))) {
				this.alarmRules = new Gson().fromJson(reader, new TypeToken<HashMap<String, AlarmRule>>(){}.getType());
	            logger.info("Loaded {} alarm rules.", alarmRules.size());
	        }
		} else {
			this.alarmRules = Arrays.stream(DefaultAlarmRules.get())
				.collect(Collectors.toMap(AlarmRule::getName, Function.identity()));
			trySaveAlarmRules();
            logger.info("Using default alarm rules.", alarmRules.size());
		}
	}

	/** Save alarm rules (in JSON format). */
	public void saveAlarmRules() throws IOException {
		if (alarmRulesFile == null) {
			throw new NullPointerException("Alarm rules file is not set");
		}
		try (BufferedWriter writer = new BufferedWriter(new FileWriter(alarmRulesFile))) {
			writer.append(new GsonBuilder().setPrettyPrinting().create().toJson(alarmRules));
		}
	}

	/** Attempt to save alarm rules to disk (if a file is specified). */
	private void trySaveAlarmRules() {
		if (alarmRulesFile != null) {
			try {
				saveAlarmRules();
			} catch (IOException e) {
				logger.error("Failed to write alarm rules file", e);
			}
		}
	}

	/* ----------------
	 * Alarm Management
	 * ---------------- */

	/** Load the given list of alarms. */
	public void loadAlarms(List<Alarm> initialAlarms) {
		logger.info("Loading {} initial alarms...", initialAlarms.size());
		initialAlarms.forEach(alarm ->
			alarms.computeIfAbsent(alarm.getRuleName(), k -> new ArrayList<>()).add(alarm)
		);
	}

	/** Returns a list of all current alarms. */
	public List<Alarm> getAlarms() {
		return alarms.values().stream().flatMap(List::stream).collect(Collectors.toList());
	}

	/** Returns the current alarm matching a given rule and entity, or null if none. */
	private Alarm getMatchingAlarm(AlarmRule rule, String entity) {
		return alarms.getOrDefault(rule.getName(), new ArrayList<>()).stream()
			.filter(alarm -> entity.equals(alarm.getEntity()) && !alarm.isAggregation())
			.findFirst().orElse(null);
	}

	/** Raise a new alarm. */
	private void raiseAlarm(AlarmRule rule, Alarm alarm) {
		logger.info("Raising alarm ({}): {}", rule.getName(), alarm);
		alarms.computeIfAbsent(rule.getName(), k -> new ArrayList<>()).add(alarm);
		notifyListeners(alarm, AlarmAction.RAISE);
	}

	/** Clear an alarm. */
	private void clearAlarm(AlarmRule rule, Alarm alarm) {
		logger.info("Clearing alarm ({}): {}", rule.getName(), alarm);
		alarm.updateSeverity(AlarmSeverity.OFF);
		if (alarms.containsKey(rule.getName())) {
			alarms.get(rule.getName()).remove(alarm);
		}
		notifyListeners(alarm, AlarmAction.CLEAR);
	}

	/** Return the pending alarm action (i.e. delayed RAISE/CLEAR) for a given rule and entity, or null if none. */
	private PendingAlarmAction getPendingAlarmAction(AlarmRule rule, String entity) {
		Map<String, PendingAlarmAction> pendingEntityActions = pendingAlarmsActions.get(rule.getName());
		if (pendingEntityActions != null) {
			PendingAlarmAction pendingAlarmAction = pendingEntityActions.get(entity);
			if (pendingAlarmAction != null) {
				return pendingAlarmAction;
			}
		}
		return null;
	}

	/** Schedule a pending alarm action (i.e. delayed RAISE/CLEAR). */
	private void schedulePendingAlarmAction(AlarmRule rule, String entity, PendingAlarmAction pendingAlarm, int delay) {
		logger.debug(
			"Scheduling {} after {}s for alarm ({}): {}",
			pendingAlarm.action,
			delay,
			rule.getName(),
			pendingAlarm.alarm
		);
		pendingAlarmsActions
			.computeIfAbsent(rule.getName(), k -> new HashMap<String, PendingAlarmAction>())
			.put(entity, pendingAlarm);
		pendingAlarm.future = scheduledExecutor.schedule(
			new PendingAlarmActionTask(rule, entity),
			delay,
			TimeUnit.SECONDS
		);
	}

	/** Cancel a pending alarm action (i.e. delayed RAISE/CLEAR). */
	private void cancelPendingAlarmAction(AlarmRule rule, String entity) {
		Map<String, PendingAlarmAction> entityAlarms = pendingAlarmsActions.get(rule.getName());
		if (entityAlarms == null) {
			return;
		}

		PendingAlarmAction pendingAlarmAction = entityAlarms.get(entity);
		if (pendingAlarmAction != null) {
			logger.debug(
				"Cancelling pending {} action for alarm ({}): {}",
				pendingAlarmAction.action,
				rule.getName(),
				pendingAlarmAction.alarm
			);
			pendingAlarmAction.future.cancel(true);
			entityAlarms.remove(entity);
		}
		if (entityAlarms.isEmpty()) {
			pendingAlarmsActions.remove(rule.getName());
		}
	}

	/* ---------------
	 * Alarm Listeners
	 * --------------- */

	/** Add an alarm listener. */
	public synchronized void addAlarmListener(AlarmListener listener) {
		alarmListeners.add(listener);
	}

	/** Remove an alarm listener. */
	public synchronized void removeAlarmListener(AlarmListener listener) {
		alarmListeners.remove(listener);
	}

	/** Remove all alarm listeners. */
	public synchronized void removeAllAlarmListeners() {
		alarmListeners.clear();
	}

	/** Notify alarm listeners. */
	private void notifyListeners(Alarm alarm, AlarmAction action) {
		alarmListeners.forEach(listener -> listener.onAlarm(new Alarm(alarm), action));
	}
}
