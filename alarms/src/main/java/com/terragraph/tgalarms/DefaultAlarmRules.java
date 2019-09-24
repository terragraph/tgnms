/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import com.terragraph.tgalarms.models.Alarm.AlarmSeverity;
import com.terragraph.tgalarms.models.AlarmRule;
import com.terragraph.tgalarms.models.AlarmRule.AlarmRuleOptions;
import com.terragraph.tgalarms.models.Event.EventId;

/**
 * Class containing default alarm rules.
 */
public class DefaultAlarmRules {
	/** Return an array containing the default alarm rules. */
	public static AlarmRule[] get() {
		return new AlarmRule[] {
			new AlarmRule(
				"alarm-NODE_STATUS", "Node is offline", EventId.NODE_STATUS.getId(), AlarmSeverity.MAJOR
			),
			new AlarmRule(
				"alarm-LINK_STATUS", "Link is offline", EventId.LINK_STATUS.getId(), AlarmSeverity.MAJOR,
				new AlarmRuleOptions.Builder().setRaiseDelay(30).setClearDelay(30).build()
			),
			new AlarmRule(
				"alarm-GPS_SYNC", "GPS is not in sync", EventId.GPS_SYNC.getId(), AlarmSeverity.MINOR
			),
			new AlarmRule(
				"alarm-UPGRADE_PREPARE", "Upgrades - PREPARE stage failed", EventId.UPGRADE_PREPARE.getId(), AlarmSeverity.MINOR
			),
			new AlarmRule(
				"alarm-UPGRADE_COMMIT", "Upgrades - COMMIT stage failed", EventId.UPGRADE_COMMIT.getId(), AlarmSeverity.MINOR
			),
			new AlarmRule(
				"alarm-MINION_SET_CONFIG", "Failed to update node config", EventId.MINION_SET_CONFIG.getId(), AlarmSeverity.MINOR
			),
		};
	}
}
