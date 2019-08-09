/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

/** Config layers for nodes. */
export const NetworkConfigMode = Object.freeze({
  NETWORK: 'NETWORK',
  NODE: 'NODE',
});

/** Config layers for E2E services. */
export const E2EConfigMode = Object.freeze({
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

/** Default node hardware type. */
export const DEFAULT_HARDWARE_BASE_KEY = 'MVL_ARMADA39X_P';

/** Query param in url for selected node. */
export const SELECTED_NODE_QUERY_PARAM = 'node';

export const STATS_LINK_QUERY_PARAM = 'linkName';
