/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {LinkTypeValueMap} from '../../../shared/types/Topology';
import {mockNetworkConfig} from './NetworkConfig';
import type {LinkMeta, NetworkContextType} from '../../contexts/NetworkContext';
import type {LinkType} from '../../../shared/types/Topology';

/**
 * Creates a fake network context which passes flow validation
 * @param {object} overrides overrides default properties of the mock context
 * @example
 * mockNetworkContext({name:'network-context-test'})
 */
export function mockNetworkContext(
  overrides?: $Shape<NetworkContextType>,
): NetworkContextType {
  const config: $Shape<NetworkContextType> = {
    networkName: '',
    networkConfig: mockNetworkConfig(),
    networkLinkHealth: {startTime: 0, endTime: 0, events: {}},
    networkNodeHealth: {startTime: 0, endTime: 0, events: {}},
    networkAnalyzerData: {},
    networkLinkMetrics: {},
    refreshNetworkConfig: () => {},
    nodeMap: {},
    linkMap: {},
    siteMap: {},
    siteToNodesMap: {},
    selectedElement: null,
    pinnedElements: [],
    setSelected: () => {},
    removeElement: () => {},
    togglePin: () => {},
    toggleExpanded: () => {},
  };
  return Object.assign(config, overrides || {});
}

/**
 * Creates a fake network context which passes flow validation
 * @param {object} overrides overrides default properties of the mock context
 * @example
 * mockLinkMap({name:'network-context-test'})
 */

export type LinkMapValue = {
  ...LinkType,
  _meta_: {angle: number, distance: number},
};

export function mockLinkMapValue(
  overrides?: $Shape<LinkMapValue>,
): $Shape<LinkType & LinkMeta> {
  return {
    name: '',
    a_node_name: '',
    z_node_name: '',
    link_type: LinkTypeValueMap.WIRELESS,
    is_alive: true,
    linkup_attempts: 0,
    golay_idx: {
      txGolayIdx: 0,
      rxGolayIdx: 0,
    },
    control_superframe: 0,
    a_node_mac: 'aa:aa:aa:aa:aa',
    z_node_mac: 'bb:bb:bb:bb:bb',
    is_backup_cn_link: false,
    _meta_: {angle: 0, distance: 0},
    ...overrides,
  };
}
