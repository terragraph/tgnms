/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {
  getAllTopologyNames,
  getNetworkInstanceConfig,
  refreshNetworkHealth,
  refreshRuckusControllerCache,
  refreshSelfTestData,
  refreshStatsTypeaheadCache,
  scheduleScansUpdate,
  scheduleTopologyUpdate,
} = require('./model');
const {refreshAnalyzerData} = require('./analyzer_data');

const _ = require('lodash');

const IM_SCAN_POLLING_ENABLED = process.env.IM_SCAN_POLLING_ENABLED
  ? process.env.IM_SCAN_POLLING_ENABLED === '1'
  : 0;

const MS_IN_SEC = 1000;
const MS_IN_MIN = 60 * 1000;

const DEFAULT_SCAN_POLL_INTERVAL = 1 * MS_IN_MIN;
const DEFAULT_TOPOLOGY_REFRESH_INTERVAL = 5 * MS_IN_SEC;
const HEALTH_REFRESH_INTERVAL = 30 * MS_IN_SEC;
const RUCKUS_CONTROLLER_REFRESH_INTERVAL = 1 * MS_IN_MIN;
const TYPEAHEAD_REFRESH_INTERVAL = 5 * MS_IN_MIN;

let periodicTasks = [];

function runNowAndSchedule(task, interval) {
  task();
  const timer = setInterval(task, interval);
  periodicTasks.push(timer);
}

function stopPeriodicTasks() {
  periodicTasks.map(timer => {
    clearInterval(timer);
  });
  periodicTasks = [];
}

function startPeriodicTasks() {
  console.log('periodic: starting periodic tasks...');
  const config = getNetworkInstanceConfig();
  if (config.ruckus_controller) {
    // ruckus data is fetched from BQS
    // all topologies will use the same ruckus controller for now
    runNowAndSchedule(
      refreshRuckusControllerCache,
      RUCKUS_CONTROLLER_REFRESH_INTERVAL,
    );
  }

  runNowAndSchedule(refreshHealthData, HEALTH_REFRESH_INTERVAL);
  runNowAndSchedule(refreshSelfTestCache, TYPEAHEAD_REFRESH_INTERVAL);
  // start poll request interval for topology/statis
  runNowAndSchedule(
    scheduleTopologyUpdate,
    _.get(config, 'refresh_interval', DEFAULT_TOPOLOGY_REFRESH_INTERVAL),
  );

  if (IM_SCAN_POLLING_ENABLED) {
    console.log('IM_SCAN_POLLING_ENABLED is set');

    runNowAndSchedule(
      scheduleScansUpdate,
      _.get(config, 'scan_poll_interval', DEFAULT_SCAN_POLL_INTERVAL),
    );
  }
}

function refreshHealthData() {
  console.log('periodic: refreshing health cache');
  const allConfigs = getAllTopologyNames();
  allConfigs.forEach(configName => {
    console.log(
      'periodic: refreshing cache (health, analyzer) for',
      configName,
    );
    refreshNetworkHealth(configName);
    refreshAnalyzerData(configName);
  });
}

function refreshSelfTestCache() {
  console.log('periodic: refreshing self-test cache');
  const allConfigs = getAllTopologyNames();
  allConfigs.forEach(configName => {
    console.log('periodic: refreshing self-test for', configName);
    refreshSelfTestData(configName);
  });
}

module.exports = {
  stopPeriodicTasks,
  startPeriodicTasks,
};
