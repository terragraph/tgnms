/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
