
const {
  getAllTopologyNames,
  getNetworkInstanceConfig,
  refreshNetworkHealth,
  refreshRuckusControllerCache,
  refreshSelfTestData,
  refreshStatsTypeaheadCache,
  scheduleStatsUpdate,
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

const periodicTasks = [];

function runNowAndSchedule(task, interval) {
  task();
  const timer = setTimeout(task, interval);
  periodicTasks.push(timer);
}

function stopPeriodicTasks() {
  periodicTasks.map(function (timer) {
    clearInterval(timer);
  });
  periodicTasks = [];
}

function startPeriodicTasks() {
  console.log('Starting periodic tasks...');
  const config = getNetworkInstanceConfig();
  if (config.ruckus_controller) {
    // ruckus data is fetched from BQS
    // all topologies will use the same ruckus controller for now
    runNowAndSchedule(
      refreshRuckusControllerCache,
      RUCKUS_CONTROLLER_REFRESH_INTERVAL,
    );
  }

  networkHealthTimer = runNowAndSchedule(
    refreshHealthData,
    HEALTH_REFRESH_INTERVAL,
  );
  statsTypeaheadTimer = runNowAndSchedule(
    refreshTypeaheadData,
    TYPEAHEAD_REFRESH_INTERVAL,
  );
  // start poll request interval for topology/statis
  refreshIntervalTimer = runNowAndSchedule(
    scheduleTopologyUpdate,
    _.get(config, 'refresh_interval', DEFAULT_TOPOLOGY_REFRESH_INTERVAL),
  );

  if (IM_SCAN_POLLING_ENABLED) {
    console.log('IM_SCAN_POLLING_ENABLED is set');

    runNowAndSchedule(
      scheduleStatsUpdate,
      _.get(config, 'scan_poll_interval', DEFAULT_SCAN_POLL_INTERVAL),
    );
  }
}

function refreshHealthData() {
  console.log('Refreshing health cache');
  const allConfigs = getAllTopologyNames();
  allConfigs.forEach(configName => {
    console.log('Refreshing cache (health, analyzer) for',
                configName);
    refreshNetworkHealth(configName);
    refreshAnalyzerData(configName);
  });
};

function refreshTypeaheadData() {
  console.log('Refreshing typeahead cache');
  const allConfigs = getAllTopologyNames();
  allConfigs.forEach(configName => {
    console.log('Refreshing cache (stats type-ahead) for',
                configName);
    refreshStatsTypeaheadCache(configName);
    refreshSelfTestData(configName);
  });
};

module.exports = {
  stopPeriodicTasks,
  startPeriodicTasks,
}
