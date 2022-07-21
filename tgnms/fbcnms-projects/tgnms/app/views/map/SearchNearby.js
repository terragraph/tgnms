/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SearchNearbyPanel from '@fbcnms/tg-nms/app/views/map/mappanels/SearchNearbyPanel';
import Slide from '@material-ui/core/Slide';
import {SlideProps} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

import type {NearbyNodes} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';

export default function SearchNearby({
  nodeName,
  searchNearbyProps,
}: {
  nodeName: string,
  searchNearbyProps: {|
    nearbyNodes: NearbyNodes,
    onUpdateNearbyNodes: NearbyNodes => *,
  |},
}) {
  const {networkName, networkConfig, nodeMap, siteMap} = useNetworkContext();
  const {topology} = networkConfig;
  const node = nodeMap[nodeName];
  const {createSite, createNode, createLink} = useTopologyBuilderContext();

  return (
    <Slide {...SlideProps} in={true}>
      <SearchNearbyPanel
        networkName={networkName}
        topology={topology}
        node={node}
        site={siteMap[node.site_name]}
        onClose={() => {}}
        onAddNode={params => createNode({nodes: [params]})}
        onAddLink={params => createLink({links: [params]})}
        onAddSite={params => createSite({site: params})}
        {...searchNearbyProps}
      />
    </Slide>
  );
}
