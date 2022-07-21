/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.terragraph.tgalarms.kafka;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.apache.kafka.streams.KeyValue;
import org.apache.kafka.streams.processor.AbstractProcessor;
import org.apache.kafka.streams.processor.ProcessorContext;
import org.apache.kafka.streams.processor.PunctuationType;
import org.apache.kafka.streams.state.KeyValueIterator;
import org.apache.kafka.streams.state.KeyValueStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.terragraph.tgalarms.AlarmListener;
import com.terragraph.tgalarms.AlarmService;
import com.terragraph.tgalarms.models.Alarm;
import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.Event;

/**
 * Kafka Streams processor.
 */
public class KafkaAlarmProcessor extends AbstractProcessor<String, Event> {
	private static final Logger logger = LoggerFactory.getLogger(KafkaAlarmProcessor.class);

	/** The alarm service instance. */
	private final AlarmService alarmService;

	/** The persistent Kafka store name. */
	private final String storeName;

	/** The punctuation interval. */
	private final Duration punctuationInterval;

	/** The alarms store. */
	private KeyValueStore<String, Alarm> alarmStore;

	/** The context. */
	private ProcessorContext context;

	/** Constructor. */
	public KafkaAlarmProcessor(AlarmService service, String storeName, Duration punctuationInterval) {
		this.alarmService = service;
		this.storeName = storeName;
		this.punctuationInterval = punctuationInterval;
	}

	@Override
	@SuppressWarnings("unchecked")
	public void init(ProcessorContext context) {
		this.context = context;
		this.alarmStore = (KeyValueStore<String, Alarm>) context.getStateStore(storeName);

		context.schedule(punctuationInterval, PunctuationType.WALL_CLOCK_TIME, this::update);
	}

	@Override
	public void process(String key, Event event) {
		// Attach an alarm listener
		Map<String, Alarm> alarms = new HashMap<>();
		AlarmListener listener = (alarm, action) -> alarms.put(alarm.getId(), alarm);
		alarmService.addAlarmListener(listener);

		// Process the event
		alarmService.processEvent(event);
		alarmService.removeAlarmListener(listener);
		alarms.values().stream().forEach(alarm -> {
			String id = alarm.getId();

			// Forward updated alarms
			context.forward(id, alarm);

			// Update store
			if (alarm.isActive()) {
				alarmStore.put(id, alarm);
			} else {
				alarmStore.delete(id);
			}

			logger.debug("Updated alarm: {}", alarm);
		});
		context.commit();
	}

	/** Periodically check for newly raised/cleared alarms - forward them and update the State Store. */
	protected void update(long timestamp) {
		Map<String, Alarm> currentAlarms =
			alarmService.getAlarms().stream().collect(Collectors.toMap(Alarm::getId, Function.identity()));

		// Find any alarms that were cleared
		List<String> keysToRemove = new ArrayList<>();
		try (KeyValueIterator<String, Alarm> iter = alarmStore.all()) {
			while (iter.hasNext()) {
				KeyValue<String, Alarm> entry = iter.next();
				String id = entry.key;
				Alarm alarm = entry.value;
				if (!currentAlarms.containsKey(id)) {
					alarm.updateSeverity(AlarmSeverity.OFF);
					context.forward(id, alarm);
					keysToRemove.add(id);
					logger.debug("update(): Cleared alarm: {}", alarm);
				}
			}
		}
		keysToRemove.forEach(id -> {
			// NOTE: need to do this separately because iter.remove() is unsupported
			alarmStore.delete(id);
		});

		// Find any alarms that were raised
		currentAlarms.forEach((id, alarm) -> {
			if (alarmStore.get(id) == null) {
				context.forward(id, alarm);
				alarmStore.put(id, alarm);
				logger.debug("update(): Raised alarm: {}", alarm);
			}
		});
	}
}
