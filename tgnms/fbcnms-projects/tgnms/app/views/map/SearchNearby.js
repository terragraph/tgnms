/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SearchNearbyPanel from '@fbcnms/tg-nms/app/views/map/mappanels/SearchNearbyPanel';
import Slide from '@material-ui/core/Slide';
import {
  SlideProps,
  TopologyElement,
} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {EditTopologyElementParams} from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/useTopologyBuilderForm';
import type {NearbyNodes} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';

export default function SearchNearby({
  onAddTopology,
  nodeName,
  searchNearbyProps,
}: {
  nodeName: string,
  searchNearbyProps: {|
    nearbyNodes: NearbyNodes,
    onUpdateNearbyNodes: NearbyNodes => *,
  |},
  onAddTopology: (
    x: EditTopologyElementParams,
    t: $Values<typeof TopologyElement>,
  ) => *,
}) {
  const {networkName, networkConfig, nodeMap, siteMap} = useNetworkContext();
  const {topology} = networkConfig;
  const node = nodeMap[nodeName];

  return (
    <Slide {...SlideProps} in={true}>
      <SearchNearbyPanel
        networkName={networkName}
        topology={topology}
        node={node}
        site={siteMap[node.site_name]}
        onClose={() => {}}
        onAddNode={params => onAddTopology(params, TopologyElement.node)}
        onAddLink={params => onAddTopology(params, TopologyElement.link)}
        onAddSite={params => onAddTopology(params, TopologyElement.site)}
        {...searchNearbyProps}
      />
    </Slide>
  );
}
