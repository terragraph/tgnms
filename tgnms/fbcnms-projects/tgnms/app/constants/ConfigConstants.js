/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

/** Config layers for nodes and E2E services. */
export const NetworkConfigMode = Object.freeze({
  NETWORK: 'NETWORK',
  NODE: 'NODE',
  CONTROLLER: 'CONTROLLER',
  AGGREGATOR: 'AGGREGATOR',
});

/** Config layers and their rendered names. */
export const ConfigLayer = Object.freeze({
  BASE: 'Base value',
  AUTO_NODE: 'Automatic node override',
  NETWORK: 'Network override',
  NODE: 'Node override',
  E2E: 'Override',
  DRAFT: 'Draft value',
});

/** Config metadata constraints and their rendered names. */
export const ConfigConstraint = Object.freeze({
  allowedRanges: 'Allowed ranges',
  allowedValues: 'Allowed values',
  regexMatches: 'Regular expression',
  intRanges: 'Integer ranges',
  floatRanges: 'Float ranges',
});

export type ConfigConstraintType = {
  allowedRanges: Array<Array<number>>,
  allowedValues: Array<number>,
  regexMatches: Array<number>,
  intRanges: Array<Array<number>>,
  floatRanges: Array<Array<number>>,
};

/** Config metadata base types (i.e. non-recursive). */
export const ConfigBaseTypes = Object.freeze([
  'INTEGER',
  'FLOAT',
  'STRING',
  'BOOLEAN',
]);

/** Delimiter between adjacent keys in a config field. */
export const CONFIG_FIELD_DELIMITER = '.';

/** Default node software version. */
export const DEFAULT_BASE_KEY = 'default';

/** Default node firmware version. */
export const DEFAULT_FIRMWARE_BASE_KEY = 'none';

/** Default node hardware type. */
export const DEFAULT_HARDWARE_BASE_KEY = 'MVL_ARMADA39X_P';

/** Query param in url for selected node. */
export const SELECTED_NODE_QUERY_PARAM = 'node';

export const STATS_LINK_QUERY_PARAM = 'linkName';
