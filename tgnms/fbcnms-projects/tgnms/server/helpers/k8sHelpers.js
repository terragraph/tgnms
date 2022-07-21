/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const spawnSync = require('child_process').spawnSync;
const logger = require('../log')(module);

export function k8s_name(name: string) {
  return name
    .replace(/ /g, '-')
    .replace(/_/g, '-')
    .replace(/[^0-9a-zA-Z-]/g, '');
}

function run_k8s_script(networkName: string, scriptName: string) {
  const result = spawnSync('bash', [scriptName, k8s_name(networkName)]);
  if (result.status !== 0) {
    logger.error(`Failed to run ${scriptName}`);
    throw `Failed to run ${scriptName}`;
  }
}

export function deleteK8sController(networkName: string) {
  return run_k8s_script(networkName, 'scripts/delete_network.sh');
}

export function createK8sController(networkName: string) {
  return run_k8s_script(networkName, 'scripts/create_network.sh');
}
