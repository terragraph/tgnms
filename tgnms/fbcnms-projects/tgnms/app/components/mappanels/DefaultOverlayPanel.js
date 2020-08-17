/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NetworkContext from '../../contexts/NetworkContext';
import axios from 'axios';
import useInterval from '@fbcnms/ui/hooks/useInterval';
import {
  AREA_POLYGONS,
  LINK_METRIC_OVERLAYS,
  LinkOverlayColors,
  NODE_OVERLAYS,
  SITE_METRIC_OVERLAYS,
  SiteOverlayColors,
} from '../../constants/LayerConstants';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {useMapContext} from '../../contexts/MapContext';

import type {Overlay} from '../../views/map/NetworkMapTypes';

// Interval at which link overlay metrics are refreshed (in ms)
const LINK_OVERLAY_METRIC_REFRESH_INTERVAL_MS = 30000;

const defaultOverlays = {
  link_lines: 'ignition_status',
  site_icons: 'health',
  area_polygons: 'prefix_zone',
  nodes: 'bearing',
};

export default function DefaultOverlayPanel() {
  const {
    setOverlaysConfig,
    selectedOverlays,
    setOverlayData,
    setSelectedOverlays,
    setIsOverlayLoading,
  } = useMapContext();
  const {networkName} = React.useContext(NetworkContext);
  const [lastRefreshDate, setLastRefreshDate] = React.useState(new Date());

  useInterval(() => {
    setLastRefreshDate(new Date());
  }, LINK_OVERLAY_METRIC_REFRESH_INTERVAL_MS);
  /**
   * when component first mounts, change the available overlays and select
   * the default overlays
   */
  React.useEffect(() => {
    setOverlaysConfig({
      link_lines: {
        layerId: 'link_lines',
        overlays: objectValuesTypesafe(LINK_METRIC_OVERLAYS),
        legend: LinkOverlayColors,
        defaultOverlayId: defaultOverlays.link_lines,
      },
      site_icons: {
        layerId: 'site_icons',
        overlays: objectValuesTypesafe<Overlay>(SITE_METRIC_OVERLAYS),
        legend: SiteOverlayColors,
        defaultOverlayId: defaultOverlays.site_icons,
      },
      area_polygons: {
        layerId: 'area_polygons',
        overlays: objectValuesTypesafe<Overlay>(AREA_POLYGONS),
        defaultOverlayId: defaultOverlays.area_polygons,
        legend: SiteOverlayColors,
      },
      nodes: {
        layerId: 'nodes',
        overlays: objectValuesTypesafe<Overlay>(NODE_OVERLAYS),
        defaultOverlayId: defaultOverlays.nodes,
        legend: {},
      },
    });
  }, [setOverlaysConfig, setSelectedOverlays]);

  React.useEffect(() => {
    async function fetchLinkOverlayData() {
      if (selectedOverlays.link_lines) {
        setIsOverlayLoading(true);
        const overlay = LINK_METRIC_OVERLAYS[selectedOverlays.link_lines];
        if (!overlay) {
          console.error(`no overlay with id: ${selectedOverlays.link_lines}`);
          return;
        }
        const metricNames = Array.isArray(overlay.metrics)
          ? overlay.metrics.join(',')
          : overlay.id;
        try {
          const response = await axios.get<{}, {}>(
            `/metrics/overlay/linkStat/${networkName}/${metricNames}`,
          );
          setOverlayData({link_lines: response.data});
        } catch (error) {
          console.error(error);
        } finally {
          setIsOverlayLoading(false);
        }
      }
    }
    fetchLinkOverlayData();
  }, [
    networkName,
    selectedOverlays.link_lines,
    setOverlayData,
    lastRefreshDate,
    setIsOverlayLoading,
  ]);

  return <span />;
}
