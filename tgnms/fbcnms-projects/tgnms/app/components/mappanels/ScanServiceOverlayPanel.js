/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NmsOptionsContext from '../../contexts/NmsOptionsContext';
import {
  AREA_POLYGONS,
  LinkOverlayColors,
  SITE_METRIC_OVERLAYS,
  SiteOverlayColors,
  TEST_EXECUTION_LINK_OVERLAYS,
} from '../../constants/LayerConstants';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';
import {useMapContext} from '../../contexts/MapContext';

import type {Overlay} from '../../views/map/NetworkMapTypes';

const defaultOverlays = {
  link_lines: 'health',
  site_icons: 'health',
  area_polygons: 'prefix_zone',
};

export default function ScanServiceOverlayPanel() {
  const {
    setOverlaysConfig,
    selectedOverlays,
    setOverlayData,
    setSelectedOverlays,
  } = useMapContext();
  const {networkMapOptions} = React.useContext(NmsOptionsContext);

  /**
   * when component first mounts, change the available overlays and select
   * the default overlays
   */
  React.useEffect(() => {
    setOverlaysConfig({
      link_lines: {
        layerId: 'link_lines',
        overlays: objectValuesTypesafe<Overlay>(TEST_EXECUTION_LINK_OVERLAYS),
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
    });
  }, [setOverlaysConfig, setSelectedOverlays]);

  React.useEffect(() => {
    if (networkMapOptions.testExecutionData) {
      const linkLinesData =
        networkMapOptions.testExecutionData[selectedOverlays.link_lines];
      setOverlayData({link_lines: linkLinesData});
    }
  }, [selectedOverlays, setOverlayData, networkMapOptions]);

  return <span />;
}
