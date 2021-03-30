/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @format
 */

const {logScuba, sendScubaLog, logDebug} = require('./logging');

global.experimentalYarnHooks = {
  resolveStep: function(fn) {
    const start = Date.now();
    return fn().then(
      () => {
        logScuba('resolve_time', Date.now() - start);
      },
      error => {
        logScuba('error_type', 'resolution');
        throw error;
      },
    );
  },
  fetchStep: function(fn) {
    const start = Date.now();
    return fn().then(
      () => {
        logScuba('fetch_time', Date.now() - start);
      },
      error => {
        logScuba('error_type', 'fetch');
        throw error;
      },
    );
  },
  linkStep: function(fn) {
    const start = Date.now();
    return fn().then(
      () => {
        logScuba('link_time', Date.now() - start);
      },
      error => {
        logScuba('error_type', 'link');
        throw error;
      },
    );
  },
  buildStep: function(fn) {
    const start = Date.now();
    return fn().then(
      () => {
        logScuba('build_time', Date.now() - start);
      },
      error => {
        logScuba('error_type', 'build');
        throw error;
      },
    );
  },
};

process.on('exit', function() {
  logScuba('run_time', process.uptime() * 1000);
  sendScubaLog();
});
