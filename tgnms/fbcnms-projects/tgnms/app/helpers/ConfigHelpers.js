/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {ConfigConstraint, ConfigLayer} from '../constants/ConfigConstants.js';
import {NodeTypeValueMap} from '../../shared/types/Topology';
import {
  cloneDeep,
  forOwn,
  get,
  isEmpty,
  isObject,
  isPlainObject,
  merge,
  set,
} from 'lodash';
import {isNodeAlive} from './NetworkHelpers';
import {objectEntriesTypesafe} from './ObjectHelpers';
import type {AggregatorConfigType} from '../../shared/types/Aggregator';
import type {ControllerConfigType} from '../../shared/types/Controller';
import type {NetworkConfig} from '../NetworkContext';

export type NodeConfigStatusType = {
  name: string,
  macAddr: string,
  isAlive: boolean,
  version: ?string,
  hardwareBoardId: ?string,
  hasOverride: boolean,
  isCn: boolean,
};

/**
 * Process a list of config layers with metadata, and return a data structure
 * used by ConfigTable.
 *
 * Example return value:
 * [
 *   {
 *     field: ['sysParams', 'managedConfig'],
 *     layers: [
 *       {
 *         "id": "Base value",
 *         "value": false
 *       },
 *       {
 *         "id": "Network override",
 *         "value": true
 *       },
 *       {
 *         "id": "Unsaved value",
 *         "value": true
 *       }
 *     ],
 *     hasOverride: true,
 *     hasTopLevelOverride: true,
 *     metadata: {<ConfigMetadata object>},
 *   },
 *   ... <more values>
 * ]
 */
export const processConfigs = (
  configLayers: Array<{
    id: string,
    value: ?Object,
  }>,
  metadata: Object,
  keys: Array<string> = [],
) => {
  const entries = [];

  // Find all config fields via object union
  const stackedFields = [...configLayers].reduce((stacked, config) => {
    return isPlainObject(config.value) &&
      typeof config.value !== 'number' &&
      config.value !== null &&
      config.value !== undefined
      ? [...stacked, ...Object.keys(config.value)]
      : stacked;
  }, []);
  const configFields = Array.from(new Set(stackedFields));

  // Loop through the config fields...
  configFields.forEach(fieldName => {
    keys.push(fieldName);

    // Get values per layer and field metadata
    const nextLayers = configLayers.map<{
      id: string,
      value: ?(ControllerConfigType | AggregatorConfigType),
    }>(layer => ({
      ...layer,
      value:
        layer.value && layer.value[fieldName] ? layer.value[fieldName] : null,
    }));
    const hasDescendents = nextLayers.find(layer => isPlainObject(layer.value));
    const fieldMetadata = getMetadata(metadata, fieldName);

    // Push if this is a valid config field (leaf node or present in metadata)
    if (
      (fieldMetadata &&
        fieldMetadata.hasOwnProperty('type') &&
        fieldMetadata.type !== 'MAP' &&
        fieldMetadata.type !== 'OBJECT') ||
      (!fieldMetadata && !hasDescendents)
    ) {
      entries.push({
        field: cloneDeep(keys),
        layers: nextLayers,
        hasOverride:
          nextLayers.filter(
            layer => layer.id !== ConfigLayer.BASE && layer.value !== null,
          ).length > 0,
        hasTopLevelOverride: nextLayers[nextLayers.length - 2].value !== null,
        metadata: fieldMetadata || {},
      });
    }

    // Recurse if there are descendents
    if (hasDescendents) {
      entries.push(...processConfigs(nextLayers, fieldMetadata, keys));
    }

    keys.pop();
  });

  return entries;
};

/**
 * Return a sorted list of nodes in the topology as structured objects.
 */
export const getTopologyNodeList = (
  networkConfig: NetworkConfig,
  nodeOverridesConfig: ?$Shape<NetworkConfig>,
) => {
  const {topology, status_dump} = networkConfig;

  const nodeList = topology.nodes.map<NodeConfigStatusType>(node => {
    const statusReport = status_dump.statusReports[node.mac_addr];
    return {
      name: node.name,
      macAddr: node.mac_addr,
      isAlive: isNodeAlive(node.status),
      version: (statusReport && statusReport.version) || null,
      hardwareBoardId: (statusReport && statusReport.hardwareBoardId) || null,
      hasOverride:
        nodeOverridesConfig !== undefined &&
        nodeOverridesConfig !== null &&
        nodeOverridesConfig.hasOwnProperty(node.name) &&
        !isEmpty(nodeOverridesConfig[node.name]),
      isCn: node.node_type === NodeTypeValueMap.CN,
    };
  });
  nodeList.sort((a, b) => a.name.localeCompare(b.name));

  return nodeList;
};

/**
 * Return a list of all image version strings for the given topology
 * (for use in config-related API calls).
 */
export const getNodeVersions = (networkConfig: NetworkConfig) => {
  const {topology, status_dump} = networkConfig;
  if (!topology || !topology.nodes) {
    return [];
  }

  const imageVersions = topology.nodes
    .filter(node => status_dump.statusReports.hasOwnProperty(node.mac_addr))
    .map(node => status_dump.statusReports[node.mac_addr].version);
  return Array.from<string>(new Set(imageVersions));
};

/**
 * Validate a config value based on constraints in the metadata.
 */
export const validateField = (value: number | string | boolean, metadata: Object) => {
  const {intVal, floatVal, strVal} = metadata;

  let error = false;
  switch (metadata.type) {
    case 'INTEGER':
      error = typeof value !== 'number' || !validateNumber(value, intVal || {});
      break;
    case 'FLOAT':
      error =
        typeof value !== 'number' || !validateNumber(value, floatVal || {});
      break;
    case 'STRING':
      error = typeof value !== 'string' || !validateString(value, strVal || {});
      break;
    case 'BOOLEAN':
      error = typeof value !== 'boolean';
      break;
  }
  return !error;
};

const validateNumber = (value: number, constraints: ConfigConstraint) => {
  // Validate a numeric config field
  if (value !== undefined && (typeof value !== 'number' || isNaN(value))) {
    return false;
  }

  // Check allowed values
  const hasAllowedValues = constraints.hasOwnProperty('allowedValues');
  const inAllowedValues =
    hasAllowedValues && constraints.allowedValues.includes(value);

  // Check allowed ranges
  const hasAllowedRanges = constraints.hasOwnProperty('allowedRanges');
  const inAllowedRanges =
    hasAllowedRanges &&
    constraints.allowedRanges.find(
      range => value >= range[0] && value <= range[1],
    );

  return (
    (!hasAllowedValues && !hasAllowedRanges) ||
    (hasAllowedValues && inAllowedValues) ||
    (hasAllowedRanges && inAllowedRanges)
  );
};

const validateString = (value, constraints) => {
  // Validate a string config field
  if (value !== undefined && typeof value !== 'string') {
    return false;
  }

  // Check allowed values
  const hasAllowedValues = constraints.hasOwnProperty('allowedValues');
  const inAllowedValues =
    hasAllowedValues && constraints.allowedValues.includes(value);

  // Check allowed ranges
  let hasRanges = false;
  let inRanges = false;
  if (constraints.hasOwnProperty('intRanges')) {
    hasRanges = true;
    const parsedValue = parseInt(value, 10);
    if (validateNumber(parsedValue, {allowedRanges: constraints.intRanges})) {
      inRanges = true;
    }
  }
  if (constraints.hasOwnProperty('floatRanges')) {
    hasRanges = true;
    const parsedValue = parseFloat(value);
    if (validateNumber(parsedValue, {allowedRanges: constraints.floatRanges})) {
      inRanges = true;
    }
  }

  // Check regex (ECMAScript)
  const hasRegex = constraints.hasOwnProperty('regexMatches');
  const regexMatch =
    hasRegex && new RegExp(constraints.regexMatches).test(value);

  return (
    (!hasAllowedValues && !hasRanges && !hasRegex) ||
    (hasAllowedValues && inAllowedValues) ||
    (hasRanges && inRanges) ||
    (hasRegex && regexMatch)
  );
};

/**
 * Recursively sort a config object alphabetically.
 */
export const sortConfig = (config: ?{}) => {
  if (config === null || config === undefined) {
    return config;
  }

  const newConfig = {};
  Object.keys(config)
    .sort(alphabeticalSort)
    .forEach(key => {
      const value = config[key];
      const newValue = isPlainObject(value) ? sortConfig(value) : value;
      newConfig[key] = newValue;
    });

  return newConfig;
};

const alphabeticalSort = (a, b) => {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA < lowerB) {
    return -1;
  } else if (lowerA > lowerB) {
    return 1;
  }
  return 0;
};

/**
 * Return an object without any empty nested objects
 * @param  {Object} obj
 * @return {Object}
 */
export const cleanupObject = (obj: Object) => {
  if (isEmpty(obj)) {
    return null;
  }

  const cleanedObj = {};

  forOwn(obj, (value, key) => {
    if (isObject(value)) {
      if (!isEmpty(value)) {
        const cleanedValue = cleanupObject(value);
        if (cleanedValue !== null && !isEmpty(cleanedValue)) {
          cleanedObj[key] = cleanedValue;
        }
      }
    } else {
      cleanedObj[key] = value;
    }
  });

  return cleanedObj;
};

/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 *
 * Copied from: react/packages/shared/shallowEqual.js
 */
export const shallowEqual = (objA: mixed, objB: mixed): boolean => {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !hasOwnProperty.call(objB, keysA[i]) ||
      !Object.is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
};

/**
 * Return the string form of the given object.
 */
export const stringifyConfig = (obj: Object) => {
  return JSON.stringify(obj, null, 2);
};

/**
 * Get the metadata associated with the given field (recursively).
 */
export const getFieldMetadata = (metadata: Object, field: string) => {
  let fieldMetadata = metadata;
  for (const fieldName of field) {
    fieldMetadata = getMetadata(fieldMetadata, fieldName);
    if (!fieldMetadata) {
      break;
    }
  }
  return fieldMetadata || null;
};

/**
 * Get the metadata associated with the given field name.
 */
export const getMetadata = (metadata: Object, fieldName: string) => {
  if (!metadata) {
    return null;
  }

  let fieldMetadata = {};

  // Parse data types...
  if (metadata.type === 'MAP') {
    fieldMetadata = metadata.mapVal;
  } else if (metadata.type === 'OBJECT') {
    fieldMetadata = get(metadata, `objVal.properties.${fieldName}`, {});
  } else {
    fieldMetadata = metadata[fieldName];
  }

  // Inherit some properties from parent
  if (fieldMetadata) {
    if (metadata.deprecated) {
      fieldMetadata.deprecated = metadata.deprecated;
    }
    if (metadata.action && !fieldMetadata.action) {
      fieldMetadata.action = metadata.action;
    }
    if (metadata.desc && !fieldMetadata.desc && metadata.type === 'MAP') {
      fieldMetadata.desc = metadata.desc;
    }
    if (metadata.readOnly) {
      fieldMetadata.readOnly = metadata.readOnly;
    }
  }

  return fieldMetadata;
};

/**
 * Construct a fake config object from the given metadata (traversing objects).
 */
export const constructConfigFromMetadata = (
  metadata: Object,
  keys: Array<string> = [],
) => {
  const obj = {};
  objectEntriesTypesafe<string, Object>(metadata).forEach(([key, val]) => {
    if (!isPlainObject(val)) {
      return; // shouldn't happen
    }
    keys.push(key);

    // Identify a metadata block by its required fields
    if (val.hasOwnProperty('desc') && val.hasOwnProperty('type')) {
      if (val.type === 'MAP') {
        // ignore maps
      } else if (val.type === 'OBJECT') {
        const fieldMetadata = getMetadata(metadata, key);
        if (fieldMetadata) {
          merge(obj, constructConfigFromMetadata(fieldMetadata, keys));
        }
      } else {
        set(obj, keys, null);
      }
    } else {
      // Keep recursing...
      merge(obj, constructConfigFromMetadata(val, keys));
    }

    keys.pop();
  });
  return obj;
};
