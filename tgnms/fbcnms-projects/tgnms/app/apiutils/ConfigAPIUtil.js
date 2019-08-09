/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {apiServiceRequest, getErrorTextFromE2EAck} from './ServiceAPIUtil';
import {cleanupObject, sortConfig} from '../helpers/ConfigHelpers';
import {isPlainObject} from 'lodash';
import {nodeupdateServerRequest} from './NodeupdateAPIUtil';

// Generic success handler
const onSuccess = (response, key, onResolve, processResults) => {
  let cfg = JSON.parse(response.data[key]);
  if (!isPlainObject(cfg)) {
    cfg = {};
  }
  if (processResults) {
    cfg = processResults(cfg);
  }
  onResolve && onResolve(cfg);
};

// Generic error handler
const onError = (err, onReject) => {
  onReject && onReject(getErrorTextFromE2EAck(err));
};

// Sort and clean a config object
const processConfig = obj => {
  return sortConfig(cleanupObject(obj)) || {};
};

// Get base config
export const getBaseConfig = (networkName, data, onResolve, onReject) => {
  apiServiceRequest(networkName, 'getBaseConfig', data)
    .then(response =>
      onSuccess(response, 'config', onResolve, cfg => {
        const cleanedConfig = {};
        Object.keys(cfg).forEach(baseVersion => {
          const configValue = isPlainObject(cfg[baseVersion])
            ? cfg[baseVersion]
            : {};
          cleanedConfig[baseVersion] = configValue;
        }, {});
        return sortConfig(cleanedConfig);
      }),
    )
    .catch(err => onError(err, onReject));
};

// Get hardware base config
export const getHardwareBaseConfig = (
  networkName,
  data,
  onResolve,
  onReject,
) => {
  apiServiceRequest(networkName, 'getHardwareBaseConfig', data)
    .then(response => onSuccess(response, 'config', onResolve, sortConfig))
    .catch(err => onReject && onReject(getErrorTextFromE2EAck(err)));
};

// Get auto node overrides
export const getAutoOverridesConfig = (networkName, onResolve, onReject) => {
  const data = {nodes: []};
  apiServiceRequest(networkName, 'getAutoNodeOverridesConfig', data)
    .then(response =>
      onSuccess(response, 'overrides', onResolve, processConfig),
    )
    .catch(err => onError(err, onReject));
};

// Get network overrides
export const getNetworkOverridesConfig = (networkName, onResolve, onReject) => {
  return apiServiceRequest(networkName, 'getNetworkOverridesConfig')
    .then(response =>
      onSuccess(response, 'overrides', onResolve, processConfig),
    )
    .catch(err => onError(err, onReject));
};

// Get node overrides
export const getNodeOverridesConfig = (networkName, onResolve, onReject) => {
  const data = {nodes: []};
  apiServiceRequest(networkName, 'getNodeOverridesConfig', data)
    .then(response =>
      onSuccess(response, 'overrides', onResolve, processConfig),
    )
    .catch(err => onError(err, onReject));
};

// Get full node config
export const getFullNodeConfig = (networkName, data, onResolve, onReject) => {
  apiServiceRequest(networkName, 'getNodeConfig', data)
    .then(response => onSuccess(response, 'config', onResolve, sortConfig))
    .catch(err => onReject && onReject(getErrorTextFromE2EAck(err)));
};

// Get controller config
export const getControllerConfig = (networkName, onResolve, onReject) => {
  return apiServiceRequest(networkName, 'getControllerConfig')
    .then(response => onSuccess(response, 'config', onResolve, processConfig))
    .catch(err => onError(err, onReject));
};

// Get aggregator config
export const getAggregatorConfig = (networkName, onResolve, onReject) => {
  return apiServiceRequest(networkName, 'getAggregatorConfig')
    .then(response => onSuccess(response, 'config', onResolve, processConfig))
    .catch(err => onError(err, onReject));
};

// Get node config metadata
export const getConfigMetadata = (networkName, onResolve, onReject) => {
  apiServiceRequest(networkName, 'getConfigMetadata')
    .then(response => onSuccess(response, 'metadata', onResolve))
    .catch(err => onError(err, onReject));
};

// Get controller config metadata
export const getControllerConfigMetadata = (
  networkName,
  onResolve,
  onReject,
) => {
  apiServiceRequest(networkName, 'getControllerConfigMetadata')
    .then(response => onSuccess(response, 'metadata', onResolve))
    .catch(err => onError(err, onReject));
};

// Get aggregator config metadata
export const getAggregatorConfigMetadata = (
  networkName,
  onResolve,
  onReject,
) => {
  apiServiceRequest(networkName, 'getAggregatorConfigMetadata')
    .then(response => onSuccess(response, 'metadata', onResolve))
    .catch(err => onError(err, onReject));
};

// Set network overrides
export const setNetworkOverridesConfig = (
  networkName,
  networkOverridesConfig,
  onResolve,
  onReject,
) => {
  const data = {overrides: JSON.stringify(networkOverridesConfig)};
  apiServiceRequest(networkName, 'setNetworkOverridesConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Set node overrides
export const setNodeOverridesConfig = (
  networkName,
  nodeOverridesConfig,
  onResolve,
  onReject,
) => {
  const data = {overrides: JSON.stringify(nodeOverridesConfig)};
  apiServiceRequest(networkName, 'setNodeOverridesConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Set controller config
export const setControllerConfig = (
  networkName,
  controllerConfig,
  onResolve,
  onReject,
) => {
  const data = {config: JSON.stringify(controllerConfig)};
  apiServiceRequest(networkName, 'setControllerConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Set aggregator config
export const setAggregatorConfig = (
  networkName,
  aggregatorConfig,
  onResolve,
  onReject,
) => {
  const data = {config: JSON.stringify(aggregatorConfig)};
  apiServiceRequest(networkName, 'setAggregatorConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Send a configuration bundle to a node (via nodeupdate)
export const sendConfigBundleToNode = (
  macAddr,
  config,
  onResolve,
  onReject,
) => {
  const data = {node_mac: macAddr, node_config: config};
  nodeupdateServerRequest('nms_pop', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onReject && onReject(err));
};

// Get configuration bundle status for a node (via nodeupdate)
export const getConfigBundleStatus = (macAddr, onResolve, onReject) => {
  const data = {node_mac: macAddr};
  nodeupdateServerRequest('nms_pop_status', data)
    .then(response => onResolve && onResolve(response.data.ObjectServed))
    .catch(err => onReject && onReject(err));
};
