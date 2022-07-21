/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {LinkType, NodeType, SiteType} from '../types/Topology';

export type TopologyHistoryResultsType = {
  topology: {
    name: string,
    nodes: Array<$Shape<NodeType>>,
    links: Array<$Shape<LinkType>>,
    sites: Array<SiteType>,
  },
  last_updated: string,
};

export type TopologyHistoryInput = {
  networkName: string,
  startTime: string,
  endTime?: string,
};
