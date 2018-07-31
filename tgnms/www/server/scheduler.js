/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
