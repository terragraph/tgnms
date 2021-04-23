/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  getAllNetworkConfigs,
  getAllTopologyNames,
  refreshNetworkHealth,
  refreshTopologies,
  refreshPrometheusStatus,
  runNowAndWatchForTopologyUpdate,
} = require('./model');
const {runNowAndSchedule} = require('../scheduler');

const _ = require('lodash');
const logger = require('../log')(module);
const MS_IN_SEC = 1000;

const DEFAULT_TOPOLOGY_REFRESH_INTERVAL = 5 * MS_IN_SEC;
const HEALTH_REFRESH_INTERVAL = 30 * MS_IN_SEC;

function startPeriodicTasks() {
  logger.debug('periodic: starting periodic tasks...');
  const config = getAllNetworkConfigs();

  runNowAndSchedule(refreshHealthData, HEALTH_REFRESH_INTERVAL);

  // setup topology streaming, only query when something changed
  runNowAndWatchForTopologyUpdate();

  // regular poll for status (CtrlStatus, IgnitionState, UpgradeState)
  runNowAndSchedule(
    //scheduleCtrlStatusIgnitionStateUpgradeStateUpdate,
    refreshTopologies,
    _.get(config, 'refresh_interval', DEFAULT_TOPOLOGY_REFRESH_INTERVAL),
  );
}

function refreshHealthData() {
  logger.debug('periodic: refreshing health cache');
  const allConfigs = getAllTopologyNames();
  allConfigs.forEach(configName => {
    logger.debug(
      'periodic: refreshing cache (health, analyzer) for %s',
      configName,
    );
    refreshNetworkHealth(configName);
    refreshPrometheusStatus(configName);
  });
}

module.exports = {
  startPeriodicTasks,
};
