/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {CONFIG_LAYER} from '@fbcnms/tg-nms/app/constants/ConfigConstants.js';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  cloneDeep,
  forOwn,
  get,
  isEmpty,
  isEqual,
  isObject,
  isPlainObject,
  merge,
  set,
  setWith,
  unset,
} from 'lodash';
import {isNodeAlive} from './NetworkHelpers';
import {objectEntriesTypesafe} from './ObjectHelpers';

import type {AggregatorConfigType} from '@fbcnms/tg-nms/shared/types/Aggregator';
import type {
  ConfigConstraintType,
  ConfigDataLayerType,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import type {ConfigOption} from '@fbcnms/tg-nms/app/components/taskBasedConfig/ConfigOptionSelector';
import type {ControllerConfigType} from '@fbcnms/tg-nms/shared/types/Controller';
import type {NetworkConfig} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

export type NodeConfigStatusType = {
  name: string,
  macAddr: string,
  isAlive: boolean,
  version: ?string,
  firmwareVersion: ?string,
  hardwareBoardId: ?string,
  hasOverride: boolean,
  isCn: boolean,
  isPop: boolean,
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
    }>(layer => {
      return {
        ...layer,
        value:
          layer.value != null && layer.value[fieldName] != null
            ? layer.value[fieldName]
            : null,
      };
    });
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
            layer => layer.id !== CONFIG_LAYER.BASE && layer.value !== null,
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
      firmwareVersion: (statusReport && statusReport.firmwareVersion) || null,
      hardwareBoardId: (statusReport && statusReport.hardwareBoardId) || null,
      hasOverride:
        nodeOverridesConfig !== undefined &&
        nodeOverridesConfig !== null &&
        nodeOverridesConfig.hasOwnProperty(node.name) &&
        !isEmpty(nodeOverridesConfig[node.name]),
      isCn: node.node_type === NodeTypeValueMap.CN,
      isPop: node.pop_node,
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
export const validateField = (
  value: ?number | string | boolean,
  metadata: Object,
) => {
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

const validateNumber = (
  value: number,
  constraints: $Shape<ConfigConstraintType>,
) => {
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
export const getFieldMetadata = (
  metadata: Object,
  field: string | Array<string>,
) => {
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

/**
 * Return's a list of all firmware versions for the given networkConfig
 */
export const getFirmwareVersions = (networkConfig: NetworkConfig) => {
  const {topology, status_dump} = networkConfig;
  if (!topology || !topology.nodes) {
    return [];
  }

  const firmwareVersions = topology.nodes
    .filter(node => status_dump.statusReports.hasOwnProperty(node.mac_addr))
    .map(
      node => status_dump.statusReports[node.mac_addr].firmwareVersion || '',
    );
  return Array.from<string>(new Set(firmwareVersions));
};

/**
 * Check which selected option is set by default based on configs
 */
export const getDefaultSelected = ({
  options,
  configData,
}: {
  options: {[string]: ConfigOption},
  configData: {},
}) => {
  const keys = Object.keys(options);

  const selectedOption = keys.filter(key => {
    const isSelected = options[key].setConfigs?.reduce(
      (final, selectedConfig) => {
        const value = get(configData, selectedConfig.configField.split('.'));
        if (selectedConfig.set) {
          final.push(value === selectedConfig.set);
        } else {
          final.push(value != null);
        }
        return final;
      },
      [],
    );
    return isSelected?.includes(true) && !isSelected?.includes(false);
  });

  return selectedOption[0] ?? keys[0];
};

/**
 * Get layer based on formConfigMode
 */
export const getConfigLayer = ({
  editMode,
}: {
  editMode: $Values<typeof FORM_CONFIG_MODES>,
}) => {
  let currentEditMode = CONFIG_LAYER.NETWORK;
  if (
    editMode === FORM_CONFIG_MODES.CONTROLLER ||
    editMode === FORM_CONFIG_MODES.AGGREGATOR
  ) {
    currentEditMode = CONFIG_LAYER.E2E;
  } else if (
    editMode === FORM_CONFIG_MODES.MULTINODE ||
    editMode === FORM_CONFIG_MODES.NODE
  ) {
    currentEditMode = CONFIG_LAYER.NODE;
  }
  return currentEditMode;
};

/**
 * Get top layer value
 */
export const getTopLayerValue = ({layers}: {layers: ?ConfigDataLayerType}) => {
  if (layers) {
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].value != null) {
        return layers[i].value;
      }
    }
  }
  return null;
};

/**
 * Check if config has changed
 */
export const isConfigChanged = (before: {}, after: {}) => {
  return !isEqual(before, after);
};

/**
 * Merge drafts with draft config and return updated config
 */
export function getDraftConfig<T>({
  currentConfig,
  drafts,
}: {
  currentConfig: T,
  drafts: T,
}): T {
  const currentDraftConfig = cloneDeep(currentConfig) ?? {};
  if (drafts != null && typeof drafts === 'object') {
    Object.keys(drafts).forEach(configField => {
      const draftConfigValue = drafts[configField];
      if (draftConfigValue === '' || draftConfigValue === null) {
        unset(currentDraftConfig, configField.split('.'));
      } else if (typeof draftConfigValue === 'object') {
        setWith(
          currentDraftConfig,
          configField.split('.'),
          draftConfigValue,
          Object,
        );
      } else {
        set(currentDraftConfig, configField.split('.'), draftConfigValue);
      }
    });
  }

  return currentDraftConfig;
}
