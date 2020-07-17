/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

/** Config layers for nodes and E2E services. */
export const NetworkConfigMode = Object.freeze({
  FORM: 'FORM',
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

export const configModes = {
  Network: 'Network',
  POP: 'POP Nodes',
  CN: 'CN Nodes',
  Node: 'Node',
};

export const configModeDescription = {
  Network: 'description for Network',
  POP: 'description for POP',
  CN: 'description for CN',
};

export type ConfigGroupType = {
  title: string,
  inputs: Array<{label: string, configField: string}>,
};

export const configGroups = {
  Network: [
    {
      title: 'Env Params',
      inputs: [
        {label: 'CPE_INTERFACE', configField: 'envParams.CPE_INTERFACE'},
        {label: 'E2E_ENABLED', configField: 'envParams.E2E_ENABLED'},
      ],
    },
    {
      title: 'Kafka Config Params',
      inputs: [
        {
          label: 'Enable Kafka',
          configField: 'statsAgentParams.endpointParams.kafkaParams.enabled',
        },
        {
          label: 'EndPoint',
          configField:
            'statsAgentParams.endpointParams.kafkaParams.config.brokerEndpointList',
        },
        {
          label: 'Messages Batch Number',
          configField:
            'statsAgentParams.endpointParams.kafkaParams.config.batchNumMessages',
        },
      ],
    },
  ],
  POP: [
    {
      title: 'bgpParams',
      inputs: [
        {label: 'localAsn', configField: 'bgpParams.localAsn'},
        {
          label: 'neightbor asn',
          configField: 'bgpParams.neighbors.0.asn',
        },
        {
          label: 'neightbor ipv6',
          configField: 'bgpParams.neighbors.0.ipv6',
        },
        {
          label: 'specificNetworkPrefixes',
          configField: 'bgpParams.specificNetworkPrefixes',
        },
      ],
    },
    {
      title: 'kvstoreParams',
      inputs: [
        {
          label: 'e2e-aggr-url',
          configField: 'kvstoreParams.e2e-aggr-url',
        },
        {
          label: 'e2e-ctrl-url',
          configField: 'kvstoreParams.e2e-ctrl-url',
        },
        {
          label: 'e2e-network-prefix',
          configField: 'kvstoreParams.e2e-network-prefix',
        },
      ],
    },
    {
      title: 'popParams',
      inputs: [
        {
          label: 'GW_ADDR',
          configField: 'popParams.GW_ADDR',
        },
        {
          label: 'POP_ADDR',
          configField: 'popParams.POP_ADDR',
        },
        {
          label: 'POP_BGP_ROUTING',
          configField: 'popParams.POP_BGP_ROUTING',
        },
        {
          label: 'POP_IFACE',
          configField: 'popParams.POP_IFACE',
        },
      ],
    },
  ],
  CN: [
    {
      title: 'CN config',
      inputs: [
        {
          label: 'tpcEnable',
          configField: 'linkParamsOverride.fwParams.tpcEnable',
        },
        {
          label: 'link flaps',
          configField: 'envParams.OPENR_LINK_FLAP_MAX_BACKOFF_MS',
        },
      ],
    },
  ],
  Node: [
    {
      title: 'txPower',
      inputs: [
        {
          label: 'txPower',
          configField: 'linkParamsOverride.fwParams.txPower',
        },
      ],
    },
  ],
};
