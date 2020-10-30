/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import {
  AREA_OVERLAYS,
  LINK_METRIC_OVERLAYS,
  LinkOverlayColors,
  OVERLAY_NONE,
  SCAN_CONNECTIVITY_LINK_OVERLAYS,
  SITE_METRIC_OVERLAYS,
  ScanOverlayColors,
  SiteOverlayColors,
} from '../../../constants/LayerConstants';
import {objectValuesTypesafe} from '../../../helpers/ObjectHelpers';
import {useMapContext} from '../../../contexts/MapContext';

import type {Overlay} from '../../../views/map/NetworkMapTypes';

const defaultOverlays = {
  link_lines: 'health',
  site_icons: 'health',
  area_polygons: OVERLAY_NONE.id,
  initial_link_lines: 'ignition_status',
};

export default function ScanServiceOverlayPanel() {
  const {setOverlaysConfig, selectedOverlays, setOverlayData} = useMapContext();
  const {networkMapOptions} = React.useContext(NmsOptionsContext);
  const {scanLinkData, temporaryTopology} = networkMapOptions;

  const link_lines = React.useMemo(() => {
    let linkLines = {
      layerId: 'link_lines',
      overlays: objectValuesTypesafe(LINK_METRIC_OVERLAYS),
      legend: LinkOverlayColors,
      defaultOverlayId: defaultOverlays.initial_link_lines,
    };
    if (scanLinkData) {
      linkLines = {
        layerId: 'link_lines',
        overlays: objectValuesTypesafe<Overlay>(
          SCAN_CONNECTIVITY_LINK_OVERLAYS,
        ),
        legend: ScanOverlayColors,
        defaultOverlayId: defaultOverlays.link_lines,
      };
    } else if (temporaryTopology) {
      linkLines = {
        layerId: 'link_lines',
        overlays: objectValuesTypesafe(LINK_METRIC_OVERLAYS),
        legend: ScanOverlayColors,
        defaultOverlayId: defaultOverlays.initial_link_lines,
      };
    }
    return linkLines;
  }, [scanLinkData, temporaryTopology]);

  /**
   * when component first mounts, change the available overlays and select
   * the default overlays
   */
  React.useEffect(() => {
    setOverlaysConfig({
      link_lines,
      site_icons: {
        layerId: 'site_icons',
        overlays: objectValuesTypesafe<Overlay>(SITE_METRIC_OVERLAYS),
        legend: SiteOverlayColors,
        defaultOverlayId: defaultOverlays.site_icons,
      },
      area_polygons: {
        layerId: 'area_polygons',
        overlays: objectValuesTypesafe<Overlay>(AREA_OVERLAYS),
        defaultOverlayId: defaultOverlays.area_polygons,
        legend: SiteOverlayColors,
      },
    });
  }, [setOverlaysConfig, scanLinkData, link_lines]);

  React.useEffect(() => {
    if (scanLinkData) {
      setOverlayData({link_lines: scanLinkData});
    }
  }, [selectedOverlays, setOverlayData, scanLinkData]);

  return <span />;
}
