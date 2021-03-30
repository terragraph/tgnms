/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import com.terragraph.tgalarms.AlarmService.AlarmAction;
import com.terragraph.tgalarms.models.Alarm;

/**
 * Alarm listener interface.
 */
public interface AlarmListener {
	/**
	 * Notification that an alarm was updated (e.g. raised, cleared, event added).
	 * @param alarm The new alarm structure
	 * @param action The type of action that triggered this change
	 */
	void onAlarm(Alarm alarm, AlarmAction action);
}
