/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

/** Config layers for nodes and E2E services. */
export const NETWORK_CONFIG_MODE = Object.freeze({
  NETWORK: 'NETWORK',
  NODE: 'NODE',
  CONTROLLER: 'CONTROLLER',
  AGGREGATOR: 'AGGREGATOR',
});

export const BASE_VALUE_LAYERS_TO_SKIP = 3;

/** Config layers and their rendered names. */
export const CONFIG_LAYER = Object.freeze({
  BASE: 'Base value',
  AUTO_NODE: 'Automatic node override',
  NETWORK: 'Network override',
  NODE: 'Node override',
  E2E: 'Override',
  DRAFT: 'Draft value',
});

/** Config metadata constraints and their rendered names. */
export const CONFIG_CONSTRAINT = Object.freeze({
  allowedRanges: 'Allowed ranges',
  allowedValues: 'Allowed values',
  regexMatches: 'Regular expression',
  intRanges: 'Integer ranges',
  floatRanges: 'Float ranges',
});

export type ConfigDataLayerType = Array<{
  id: string,
  value: ?(string | number | boolean),
}>;

export type ConfigConstraintType = {
  allowedRanges: Array<Array<number>>,
  allowedValues: Array<number>,
  regexMatches: Array<number>,
  intRanges: Array<Array<number>>,
  floatRanges: Array<Array<number>>,
};

/** Config metadata base types (i.e. non-recursive). */
export const CONFIG_BASE_TYPES = Object.freeze([
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

// Editor type
export const EDITOR_OPTIONS = {
  FORM: 'Form',
  TABLE: 'Table',
  JSON: 'JSON',
};

export const CONFIG_MODES = {
  NODE: 'All Nodes',
  OVERRIDE: 'Nodes with overrides',
  POP: 'POP Nodes',
  CN: 'Client Nodes',
};

export const FORM_CONFIG_MODES = {
  NETWORK: 'NETWORK',
  NODE: 'NODE',
  CONTROLLER: 'CONTROLLER',
  AGGREGATOR: 'AGGREGATOR',
  MULTINODE: 'MULTINODE',
};

export const CONFIG_PARAM_MODE = {
  NETWORK: 'networkOverridesConfig',
  NODE: 'nodeOverridesConfig',
  CONTROLLER: 'controllerConfig',
  AGGREGATOR: 'aggregatorConfig',
  MULTINODE: 'nodeOverridesConfig',
};

export const CONFIG_FORM_MODE_DESCRIPTION = {
  NETWORK: {
    title: 'Network',
    description:
      'Change parameters across the entire network, such as stats endpoints and environment settings.',
  },
  POP: {
    title: 'POP Node',
    description:
      'Set parameters on all POP nodes to enable routing in and out of the network.',
  },
  CN: {title: 'Client Node', description: 'Set client node parameters.'},
  NODE: {title: 'Node', description: 'Change parameters on specific nodes.'},
};

export const CONFIG_FORM_MODE = {
  NETWORK: 'NETWORK',
  POP: 'POP',
  CN: 'CN',
  NODE: 'NODE',
};

export type ConfigGroupType = {
  title: string,
  inputs: Array<{label: string, configField: string}>,
};

export const DATA_TYPE_TO_INPUT_TYPE = {
  INTEGER: 'number',
  INT: 'number',
  STRING: 'text',
  SECRET_STRING: 'text',
  STRING_ARRAY: 'text',
  BOOLEAN: 'checkbox',
  BOOL: 'checkbox',
  FLOAT: 'number',
};

export const SWARM_URLS = {
  NETWORKTEST_HOST: 'http://network_test:8080',
  SCANSERVICE_HOST: 'http://scan_service:8080',
  PROMETHEUS_URL: 'http://prometheus:9090',
  ALERTMANAGER_URL: 'http://alertmanager:9093',
  PROMETHEUS_CONFIG_URL: 'http://prometheus_configurer:9100',
  ALERTMANAGER_CONFIG_URL: 'http://alertmanager_configurer:9101',
  TG_ALARM_URL: 'http://alarms:40000',
  DEFAULT_ROUTES_HISTORY_HOST: 'http://default_routes_service:8080',
};
