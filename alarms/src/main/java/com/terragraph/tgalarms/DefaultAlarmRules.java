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
				"Status: Node is offline",
				"The node is not reachable.",
				EventId.NODE_STATUS.getId(),
				AlarmSeverity.MAJOR
			),
			new AlarmRule(
				"Status: Link is offline",
				"The wireless link has been down for at least 30 seconds.",
				EventId.LINK_STATUS.getId(),
				AlarmSeverity.MAJOR,
				new AlarmRuleOptions.Builder().setRaiseDelay(30).setClearDelay(30).build()
			),
			new AlarmRule(
				"Status: GPS synchronization failed",
				"The GPS is not in sync.",
				EventId.GPS_SYNC.getId(),
				AlarmSeverity.MINOR
			),
			new AlarmRule(
				"Software upgrade: Prepare failed",
				"The prepare (download and flash) phase of a software upgrade failed.",
				EventId.UPGRADE_PREPARE.getId(),
				AlarmSeverity.MINOR
			),
			new AlarmRule(
				"Software upgrade: Commit failed",
				"The commit (update boot partition and reboot) phase of a software upgrade failed.",
				EventId.UPGRADE_COMMIT.getId(),
				AlarmSeverity.MINOR
			),
			new AlarmRule(
				"Configuration: Node configuration failed",
				"The node failed to apply node configuration changes.",
				EventId.MINION_SET_CONFIG.getId(),
				AlarmSeverity.MINOR
			),
		};
	}
}
