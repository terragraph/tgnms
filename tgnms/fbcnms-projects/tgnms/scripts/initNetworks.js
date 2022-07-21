/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const yamljs = require('yamljs');
const logger = require('../server/log')(module);
const {
  createController,
  createNetwork,
  getNetworkList,
} = require('../server/topology/network');
const {NETWORK_PROVISIONING_FILE} = require('../server/config');

export async function initializeNetworks() {
  if (NETWORK_PROVISIONING_FILE === undefined) {
    logger.info(
      'Not provisioning NETWORKs, NETWORK_PROVISIONING_FILE was empty',
    );
    return;
  }

  logger.info(`Provisioning networks from ${NETWORK_PROVISIONING_FILE}`);

  const networks = yamljs.parseFile(NETWORK_PROVISIONING_FILE).networks;

  let existingNetworks = await getNetworkList();
  existingNetworks = new Set(existingNetworks.map(network => network.name));

  for (const network of networks) {
    if (!existingNetworks.has(network.name)) {
      logger.debug(`Provisioning network ${network.name}`);
      const primary = await createController(
        network.primary.api.hostname,
        network.primary.e2e.hostname,
        network.primary.api.port,
        network.primary.e2e.port,
      );

      await createNetwork(network.name, primary);
    } else {
      logger.debug(
        `Not provisioning network ${network.name}, it already exists`,
      );
    }
  }
}
