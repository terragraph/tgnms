/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

let periodicTasks = [];

function schedule(task: Function, interval: Number) {
  const timer = setInterval(task, interval);
  periodicTasks.push(timer);
}

function runNowAndSchedule(task: Function, interval: Number) {
  task();
  schedule(task, interval);
}

function stopAllTasks() {
  periodicTasks.map(timer => {
    clearInterval(timer);
  });
  periodicTasks = [];
}

module.exports = {
  schedule,
  runNowAndSchedule,
  stopAllTasks,
};
