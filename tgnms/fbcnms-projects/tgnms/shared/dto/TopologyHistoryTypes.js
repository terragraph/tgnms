/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
