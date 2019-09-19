/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {apiServiceRequest, getErrorTextFromE2EAck} from './ServiceAPIUtil';
import {cleanupObject, sortConfig} from '../helpers/ConfigHelpers';
import {isPlainObject} from 'lodash';
import {nodeupdateServerRequest} from './NodeupdateAPIUtil';

import type {AggregatorConfigType} from '../../shared/types/Aggregator';
import type {ControllerConfigType} from '../../shared/types/Controller';
import type {NodeConfigType} from '../../shared/types/NodeConfig';

import type {NodeConfigStatusType} from '../helpers/ConfigHelpers';

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
const processConfig = (
  obj: $Shape<NodeConfigType> | {[string]: $Shape<NodeConfigType>},
) => {
  return sortConfig(cleanupObject(obj)) || {};
};

// Get base config
export const getBaseConfig = (
  networkName: string,
  data: {swVersions: Array<string>},
  onResolve: (?{[string]: $Shape<NodeConfigType>}) => any,
  onReject: string => any,
) => {
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
  networkName: string,
  data: {hwBoardIds: [], swVersions: []},
  onResolve: (?{[string]: {[string]: $Shape<NodeConfigType>}}) => any,
  onReject: string => any,
) => {
  apiServiceRequest(networkName, 'getHardwareBaseConfig', data)
    .then(response => onSuccess(response, 'config', onResolve, sortConfig))
    .catch(err => onReject && onReject(getErrorTextFromE2EAck(err)));
};

// Get auto node overrides
export const getAutoOverridesConfig = (
  networkName: string,
  onResolve: (?{[string]: $Shape<NodeConfigType>}) => any,
  onReject: string => any,
) => {
  const data = {nodes: []};
  apiServiceRequest(networkName, 'getAutoNodeOverridesConfig', data)
    .then(response =>
      onSuccess(response, 'overrides', onResolve, processConfig),
    )
    .catch(err => onError(err, onReject));
};

// Get network overrides
export const getNetworkOverridesConfig = (
  networkName: string,
  onResolve: (?$Shape<NodeConfigType>) => any,
  onReject: string => any,
) => {
  return apiServiceRequest(networkName, 'getNetworkOverridesConfig')
    .then(response =>
      onSuccess(response, 'overrides', onResolve, processConfig),
    )
    .catch(err => onError(err, onReject));
};

// Get node overrides
export const getNodeOverridesConfig = (
  networkName: string,
  onResolve: (?{[string]: $Shape<NodeConfigType>}) => any,
  onReject: string => any,
) => {
  const data = {nodes: []};
  apiServiceRequest(networkName, 'getNodeOverridesConfig', data)
    .then(response =>
      onSuccess(response, 'overrides', onResolve, processConfig),
    )
    .catch(err => onError(err, onReject));
};

// Get full node config
export const getFullNodeConfig = (
  networkName: string,
  data: {nodeNames: [], configPaths: []},
  onResolve: (?{[string]: $Shape<NodeConfigType>}) => any,
  onReject: string => any,
) => {
  apiServiceRequest(networkName, 'getNodeConfig', data)
    .then(response => onSuccess(response, 'config', onResolve, sortConfig))
    .catch(err => onReject && onReject(getErrorTextFromE2EAck(err)));
};

// Get controller config
export const getControllerConfig = (
  networkName: string,
  onResolve: (?$Shape<ControllerConfigType>) => any,
  onReject: string => any,
) => {
  return apiServiceRequest(networkName, 'getControllerConfig')
    .then(response => onSuccess(response, 'config', onResolve, processConfig))
    .catch(err => onError(err, onReject));
};

// Get aggregator config
export const getAggregatorConfig = (
  networkName: string,
  onResolve: (?$Shape<AggregatorConfigType>) => any,
  onReject: string => any,
) => {
  return apiServiceRequest(networkName, 'getAggregatorConfig')
    .then(response => onSuccess(response, 'config', onResolve, processConfig))
    .catch(err => onError(err, onReject));
};

// Get node config metadata
export const getConfigMetadata = (
  networkName: string,
  onResolve: (?$Shape<NodeConfigType>) => any,
  onReject: string => any,
) => {
  apiServiceRequest(networkName, 'getConfigMetadata')
    .then(response => onSuccess(response, 'metadata', onResolve))
    .catch(err => onError(err, onReject));
};

// Get controller config metadata
export const getControllerConfigMetadata = (
  networkName: string,
  onResolve: (?$Shape<ControllerConfigType>) => any,
  onReject: string => any,
) => {
  apiServiceRequest(networkName, 'getControllerConfigMetadata')
    .then(response => onSuccess(response, 'metadata', onResolve))
    .catch(err => onError(err, onReject));
};

// Get aggregator config metadata
export const getAggregatorConfigMetadata = (
  networkName: string,
  onResolve: (?$Shape<AggregatorConfigType>) => any,
  onReject: string => any,
) => {
  apiServiceRequest(networkName, 'getAggregatorConfigMetadata')
    .then(response => onSuccess(response, 'metadata', onResolve))
    .catch(err => onError(err, onReject));
};

// Set network overrides
export const setNetworkOverridesConfig = (
  networkName: string,
  networkOverridesConfig: NodeConfigType,
  onResolve: () => any,
  onReject: string => any,
) => {
  const data = {overrides: JSON.stringify(networkOverridesConfig)};
  apiServiceRequest(networkName, 'setNetworkOverridesConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Set node overrides
export const setNodeOverridesConfig = (
  networkName: string,
  nodeOverridesConfig: {[string]: NodeConfigType},
  onResolve: () => any,
  onReject: string => any,
) => {
  const data = {overrides: JSON.stringify(nodeOverridesConfig)};
  apiServiceRequest(networkName, 'setNodeOverridesConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Set controller config
export const setControllerConfig = (
  networkName: string,
  controllerConfig: ControllerConfigType,
  onResolve: () => any,
  onReject: string => any,
) => {
  const data = {config: JSON.stringify(controllerConfig)};
  apiServiceRequest(networkName, 'setControllerConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Set aggregator config
export const setAggregatorConfig = (
  networkName: string,
  aggregatorConfig: ControllerConfigType,
  onResolve: () => any,
  onReject: string => any,
) => {
  const data = {config: JSON.stringify(aggregatorConfig)};
  apiServiceRequest(networkName, 'setAggregatorConfig', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onError(err, onReject));
};

// Send a configuration bundle to a node (via nodeupdate)
export const sendConfigBundleToNode = (
  macAddr: string,
  config: ?string,
  onResolve: () => any,
  onReject: string => any,
) => {
  const data = {node_mac: macAddr, node_config: config};
  nodeupdateServerRequest('nms_pop', data)
    .then(_response => onResolve && onResolve())
    .catch(err => onReject && onReject(err));
};

// Get configuration bundle status for a node (via nodeupdate)
export const getConfigBundleStatus = (
  macAddr: string,
  onResolve: (?$Shape<NodeConfigStatusType>) => any,
  onReject: string => any,
) => {
  const data = {node_mac: macAddr};
  nodeupdateServerRequest('nms_pop_status', data)
    .then(response => {
      onResolve && onResolve(response.data.ObjectServed);
    })
    .catch(err => onReject && onReject(err));
};
