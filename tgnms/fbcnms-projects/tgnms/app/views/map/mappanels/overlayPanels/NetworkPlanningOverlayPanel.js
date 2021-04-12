/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {
  LINK_PLANNING_LEGEND,
  LINK_PLANNING_OVERLAYS,
  NODE_PLANNING_OVERLAYS,
  SITE_PLANNING_OVERLAYS,
  SiteOverlayColors,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

const defaultOverlays = {
  link_lines: 'status_type',
  site_icons: 'status_type',
  nodes: 'status_type',
};
export default function NetworkPlanningOverlayPanel() {
  const {setOverlaysConfig} = useMapContext();

  /**
   * when component first mounts, change the available overlays and select
   * the default overlays
   */
  React.useEffect(() => {
    setOverlaysConfig({
      link_lines: {
        layerId: 'link_lines',
        overlays: objectValuesTypesafe(LINK_PLANNING_OVERLAYS),
        legend: LINK_PLANNING_LEGEND,
        defaultOverlayId: defaultOverlays.link_lines,
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: objectValuesTypesafe<Overlay>(SITE_PLANNING_OVERLAYS),
        legend: SiteOverlayColors,
        legend: LINK_PLANNING_LEGEND,
        defaultOverlayId: defaultOverlays.site_icons,
      },
      nodes: {
        layerId: 'nodes',
        overlays: objectValuesTypesafe<Overlay>(NODE_PLANNING_OVERLAYS),
        defaultOverlayId: defaultOverlays.nodes,
        legend: {},
      },
    });
  }, [setOverlaysConfig]);

  return <span />;
}
