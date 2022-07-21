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
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import NmsOptionsContext from '@fbcnms/tg-nms/app/contexts/NmsOptionsContext';
import {
  AREA_OVERLAYS,
  LINK_METRIC_OVERLAYS,
  LinkOverlayColors,
  METRIC_COLOR_RANGE,
  NETWORK_TEST_HEALTH_COLOR_RANGE,
  OVERLAY_NONE,
  SITE_METRIC_OVERLAYS,
  SITE_TEST_OVERLAYS,
  SiteOverlayColors,
  TEST_EXECUTION_LINK_OVERLAYS,
  TestOverlayColors,
} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {HEALTH_CODES} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {numToMegabits} from '@fbcnms/tg-nms/app/helpers/ScheduleHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

const defaultOverlays = {
  link_test_link_lines: 'health',
  node_test_link_links: 'ignition_status',
  site_icons: 'health',
  area_polygons: OVERLAY_NONE.id,
};

export default function NetworkTestOverlayPanel() {
  const {setOverlaysConfig, selectedOverlays, setOverlayData} = useMapContext();
  const {nodeMap, siteMap} = React.useContext(NetworkContext);
  const {networkMapOptions} = React.useContext(NmsOptionsContext);
  const isLink =
    networkMapOptions.testExecutionData?.type === TOPOLOGY_ELEMENT.LINK;
  /**
   * when component first mounts, change the available overlays and select
   * the default overlays
   */
  React.useEffect(() => {
    if (isLink) {
      setOverlaysConfig({
        link_lines: {
          layerId: 'link_lines',
          overlays: objectValuesTypesafe<Overlay>(TEST_EXECUTION_LINK_OVERLAYS),
          legend: TestOverlayColors,
          defaultOverlayId: defaultOverlays.link_test_link_lines,
        },
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
    } else {
      setOverlaysConfig({
        link_lines: {
          layerId: 'link_lines',
          overlays: objectValuesTypesafe<Overlay>(LINK_METRIC_OVERLAYS),
          legend: LinkOverlayColors,
          defaultOverlayId: defaultOverlays.node_test_link_links,
        },
        site_icons: {
          layerId: 'site_icons',
          overlays: objectValuesTypesafe<Overlay>(SITE_TEST_OVERLAYS),
          legend: TestOverlayColors,
          defaultOverlayId: defaultOverlays.site_icons,
        },
        area_polygons: {
          layerId: 'area_polygons',
          overlays: objectValuesTypesafe<Overlay>(AREA_OVERLAYS),
          defaultOverlayId: defaultOverlays.area_polygons,
          legend: SiteOverlayColors,
        },
      });
    }
  }, [isLink, setOverlaysConfig]);

  React.useEffect(() => {
    if (!networkMapOptions.testExecutionData) {
      return;
    }
    const overlayName: string = isLink ? 'link_lines' : 'site_icons';
    const selectedOverlay = selectedOverlays[overlayName];

    let data = networkMapOptions.testExecutionData.results[selectedOverlay];
    if (!isLink) {
      data = Object.keys(data).reduce((final, nodeName) => {
        final[nodeMap[nodeName]?.site_name] = GetNodeColor(
          data[nodeName],
          selectedOverlay,
        );

        return final;
      }, {});
      Object.keys(siteMap).forEach(siteName => {
        if (!data[siteName]) {
          data[siteName] =
            NETWORK_TEST_HEALTH_COLOR_RANGE[HEALTH_CODES.MISSING];
        }
      });
    }
    setOverlayData({[overlayName]: data});
  }, [
    isLink,
    selectedOverlays,
    setOverlayData,
    networkMapOptions,
    nodeMap,
    siteMap,
  ]);

  return <span />;
}

function GetNodeColor(data, selectedOverlay) {
  const aVal = data['A'][selectedOverlay] ?? -1;
  const zVal = data['Z'][selectedOverlay] ?? -1;

  if (
    SITE_TEST_OVERLAYS[selectedOverlay].name === SITE_TEST_OVERLAYS.health.name
  ) {
    const value = aVal > zVal ? aVal : zVal;

    return value !== undefined
      ? NETWORK_TEST_HEALTH_COLOR_RANGE[value]
      : NETWORK_TEST_HEALTH_COLOR_RANGE[HEALTH_CODES.MISSING];
  } else {
    const value = aVal < zVal ? aVal : zVal;
    const range = SITE_TEST_OVERLAYS.iperf_avg_throughput.range;
    const closest = range?.reduce((prev, curr) => {
      const goal = numToMegabits(value);
      return goal >= curr && goal < prev ? curr : prev;
    });

    return range && value
      ? METRIC_COLOR_RANGE[range?.indexOf(closest)]
      : NETWORK_TEST_HEALTH_COLOR_RANGE[HEALTH_CODES.MISSING];
  }
}
