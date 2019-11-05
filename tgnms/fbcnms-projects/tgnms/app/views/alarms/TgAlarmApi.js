/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import type {Match} from 'react-router-dom';
export const AM_BASE_URL = '/alarms';

export const AlarmAPIUrls = {
  viewFiringAlerts: (_nid: string | Match) => `${AM_BASE_URL}/alerts`,
  viewReceivers: (_nid: string | Match) => `${AM_BASE_URL}/receivers`,
  viewRoutes: (_nid: string | Match) => `${AM_BASE_URL}/routes`,
  viewSilences: (_nid: string | Match) => `${AM_BASE_URL}/silences`,
  // get count of matching metrics
  viewMatchingAlerts: (_nid: string | Match, alertName: string) =>
    `${AM_BASE_URL}/matching_alerts/${alertName}`,
  alertConfig: (_nid: string | Match) => `${AM_BASE_URL}/alert_config`,
  updateAlertConfig: (_nid: string | Match, alertName: string) =>
    `${AM_BASE_URL}/${alertName}`,
  //bulkAlertConfig: (_nid: string | Match) => `${AM_BASE_URL}/bulk`,
  receiverConfig: (_nid: string | Match) => `${AM_BASE_URL}/alert_receiver`,
  receiverUpdate: (_nid: string | Match, receiverName: string) =>
    `${AM_BASE_URL}/${receiverName}`,
  routeConfig: (_nid: string | Match) => `${AM_BASE_URL}/route`,
};

// TG Alarm Service
export const AlarmServiceAPIUrls = {
  getAlarmRules: () => `${AM_BASE_URL}/tg_rules`,
  addAlarmRule: () => `${AM_BASE_URL}/tg_rule_add`,
  delAlarmRule: (alarmName: string) =>
    `${AM_BASE_URL}/tg_rule_del?name=${encodeURIComponent(alarmName)}`,
};
