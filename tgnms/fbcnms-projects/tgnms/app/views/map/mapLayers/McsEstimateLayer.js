/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as turf from '@turf/turf';
import React from 'react';
import useLiveRef from '../../../hooks/useLiveRef';
import {DEFAULT_MCS_TABLE} from '../../../constants/MapProfileConstants';
import {
  LINE_TEXT_PAINT,
  MCS_INTERPOLATE_FILL_COLOR,
} from '../../../constants/LayerConstants';
import {Layer, Source} from 'react-mapbox-gl';
import {LinkTypeValueMap as LinkType} from '../../../../shared/types/Topology';
import {TopologyElementType} from '../../../constants/NetworkConstants';
import {getEstimatedNodeBearing} from '../../../helpers/TopologyHelpers';
import {useMapContext} from '../../../contexts/MapContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';
import type {GeoCoord, GeoFeature} from '@turf/turf';
import type {McsLinkBudget} from '../../../../shared/dto/MapProfile';

export const LAYER_ID = 'nodes-mcs-estimate';
export const SOURCE_ID = 'nodes-mcs-estimate-source';

const CIRCLE_STEPS = 64;
const TRIANGLE_LENGTH = 300;
const BEAM_WIDTH_DEGREES = 30;

export default function McsEstimateOverlay() {
  const {selectedOverlays, mapboxRef} = useMapContext();
  const {nodes: selectedNodesOverlay} = selectedOverlays;
  const isMcsEstimateSelected = selectedNodesOverlay === 'mcs_estimate';
  const {
    nodeMap,
    siteMap,
    linkMap,
    nodeToLinksMap,
    siteToNodesMap,
    selectedElement,
    setSelected,
  } = useNetworkContext();
  const mcsTable = useMapProfileMcsTable();
  const topologyMapsRef = useLiveRef({
    nodeMap,
    siteMap,
    linkMap,
    nodeToLinksMap,
    siteToNodesMap,
  });
  const selectedElementRef = React.useRef(selectedElement);
  selectedElementRef.current = selectedElement;
  const geoJson = React.useMemo(() => {
    if (!isMcsEstimateSelected) {
      return turf.featureCollection([]);
    }
    const {nodeMap, siteMap} = topologyMapsRef.current;
    const selected =
      selectedElement && selectedElement?.type === TopologyElementType.NODE
        ? nodeMap[selectedElement?.name]
        : null;

    const nodes = [];
    if (selected) {
      nodes.push(selected);
    }
    const features: Array<?Array<GeoFeature>> = nodes.map(node => {
      const nodeBearing = getEstimatedNodeBearing(
        node,
        topologyMapsRef.current,
      );
      // don't render the node if it has no bearing?
      if (nodeBearing === null) {
        return null;
      }
      const {location} = siteMap[node.site_name];
      const startCoords = [
        location.longitude,
        location.latitude,
        location.altitude,
      ];
      const mcsRings = mcsRingsTemplate(startCoords, mcsTable);

      // build a triangle to represent the node's radio coverage
      const triangle = sectorAngleTemplate({
        position: startCoords,
        angleDegrees: BEAM_WIDTH_DEGREES,
        bearing: nodeBearing,
        length: TRIANGLE_LENGTH,
      });
      const labels = labelsTemplate({
        position: startCoords,
        bearing: nodeBearing ?? 0,
        mcsTable,
      });

      const segments: Array<GeoFeature> = mcsRings.map((circle: GeoFeature) => {
        const intersected = turf.intersect(triangle, circle);
        if (!intersected) {
          console.error('shape intersection failed', triangle, circle);
          return circle;
        }
        intersected.properties = circle.properties;
        return intersected;
      });
      return segments.concat(labels);
    });
    const flattened = [].concat.apply(
      [],
      features.filter(x => x),
    );
    return turf.featureCollection(flattened);
  }, [topologyMapsRef, selectedElement, isMcsEstimateSelected, mcsTable]);

  React.useEffect(() => {
    if (!mapboxRef) {
      return;
    }
    /**
     * if nothing is selected, find the first wireless link in the
     * topology and select it
     */
    if (isMcsEstimateSelected && selectedElementRef.current?.name == null) {
      const {nodeMap, nodeToLinksMap, linkMap} = topologyMapsRef.current;

      for (const nodeName of Object.keys(topologyMapsRef.current.nodeMap)) {
        const node = nodeMap[nodeName];
        const linkSet = nodeToLinksMap[nodeName];
        if (!(node && linkSet && linkSet.size > 0)) {
          return;
        }
        for (const linkId of linkSet.values()) {
          const link = linkMap[linkId];
          if (link && link.link_type === LinkType.WIRELESS) {
            setSelected(TopologyElementType.NODE, nodeName);
          }
        }
      }
    }
  }, [
    mapboxRef,
    isMcsEstimateSelected,
    topologyMapsRef,
    setSelected,
    selectedElementRef,
  ]);
  return (
    <>
      <Source
        id={SOURCE_ID}
        geoJsonSource={{type: 'geojson', data: geoJson, generateId: true}}
      />
      <Layer
        id={LAYER_ID}
        before="site-layer"
        type="fill"
        sourceId={SOURCE_ID}
        layout={{}}
        filter={['all', ['==', '$type', 'Polygon']]}
        paint={{
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'mcs'],
            ...MCS_INTERPOLATE_FILL_COLOR,
          ],
          'fill-opacity': 0.3,
        }}
      />
      <Layer
        id={'mcs-estimate-text'}
        type="symbol"
        sourceId={SOURCE_ID}
        filter={['all', ['==', '$type', 'Point']]}
        layout={{
          'text-field': '{mcs}',
          'text-size': 12,
        }}
        paint={LINE_TEXT_PAINT}
      />
    </>
  );
}

function mcsRingsTemplate(location: GeoCoord, mcsTable): Array<GeoFeature> {
  const circles = [...mcsTable].map(({mcs, rangeMeters}) =>
    turf.circle(location, rangeMeters, {
      units: 'meters',
      steps: CIRCLE_STEPS,
      properties: {
        mcs,
      },
    }),
  );
  const rings = circles.map((circle, index, array) => {
    const innerCircle = array[index + 1];
    if (!innerCircle) {
      return circle;
    }
    const outerCoords = turf.getCoords(circle);
    const innerCoords = turf.getCoords(innerCircle);
    if (!outerCoords || !innerCoords) {
      console.error('missing coordinates', outerCoords, innerCoords);
      return circle;
    }

    return turf.polygon([outerCoords[0], innerCoords[0]], circle.properties, {
      id: circle.id ?? 0,
    });
  });

  return rings;
}

function labelsTemplate({
  position,
  bearing,
  mcsTable,
}: {
  position: GeoCoord,
  bearing: number,
  mcsTable: Array<McsLinkBudget>,
}): Array<GeoFeature> {
  const labelPoints: Array<GeoFeature> = [];
  // sort by range ascending so we're starting from inner rings and moving out
  const sortedAsc = [...mcsTable].sort((a, b) => a.rangeMeters - b.rangeMeters);
  for (let i = 0; i < sortedAsc.length; i++) {
    const prev: $Shape<McsLinkBudget> =
      i > 0 ? sortedAsc[i - 1] : {rangeMeters: 0};
    const ring = sortedAsc[i];
    // calculate midpoint radius between outer and inner ring
    const midpointOffset = Math.abs((ring.rangeMeters - prev.rangeMeters) / 2);
    const point = turf.transformTranslate(
      turf.point(position, {mcs: ring.mcs}),
      ring.rangeMeters - midpointOffset,
      bearing,
      {units: 'meters'},
    );
    labelPoints.push(point);
  }
  return labelPoints;
}

/**
 * Generates an isosceles triangle aiming from "position" at "bearing".
 * The length of the sides of this triangle are "length",
 * and the angle betwen the sides
 * will be "angleDegrees".
 *
 * This is used to visualize the bearing of a node, or its coverage area.
 *
 *  bearing 0 faces north
 *
 *
 * ------- <- the base of the tri, 2*length(cos(angle))
 *  \   /  <- length
 *    .    <- position
 *
 *    ^ - angle is angleDegrees
 */
function sectorAngleTemplate({
  position,
  bearing,
  angleDegrees,
  length,
}: {
  position: GeoCoord,
  bearing?: number,
  angleDegrees: number,
  length: number,
}) {
  const pointBearing = angleDegrees / 2.0;
  const startPoint = turf.point(position);
  const eastPoint = turf.transformTranslate(startPoint, length, pointBearing, {
    units: 'meters',
  });
  const westPoint = turf.transformTranslate(startPoint, length, -pointBearing, {
    units: 'meters',
  });
  // start must always be first and last coord
  const triangleCoords: Array<GeoCoord> = [
    startPoint,
    eastPoint,
    westPoint,
    startPoint,
  ].map(turf.getCoord);

  // first, build a triangle facing north
  const triangle = turf.polygon([triangleCoords]);
  turf.transformRotate(triangle, bearing ?? 0, {
    mutate: true,
    pivot: position,
  });
  return triangle;
}

function useMapProfileMcsTable() {
  const {networkConfig} = useNetworkContext();
  return React.useMemo(() => {
    let table = [...DEFAULT_MCS_TABLE];
    if (
      networkConfig != null &&
      networkConfig?.map_profile?.data?.mcsTable != null
    ) {
      table = networkConfig.map_profile.data.mcsTable;
      const mcsTable = networkConfig.map_profile.data.mcsTable;
      return mcsTable;
    }
    table.sort((a, b) => b.rangeMeters - a.rangeMeters);
    return table;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkConfig]);
}
