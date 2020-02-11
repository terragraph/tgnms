/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {mockNetworkConfig} from './NetworkConfig';
import type {NetworkContextType} from '../../contexts/NetworkContext';

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
