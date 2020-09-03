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
import {averageAngles} from '../../../helpers/MathHelpers';
import {useMapContext} from '../../../contexts/MapContext';
import {useNetworkContext} from '../../../contexts/NetworkContext';
import type {GeoCoord, GeoFeature} from '@turf/turf';
import type {NodeType as Node} from '../../../../shared/types/Topology';
import type {TopologyMaps} from '../../../helpers/TopologyHelpers';

export const LAYER_ID = 'nodes-mcs-estimate';
export const SOURCE_ID = 'nodes-mcs-estimate-source';

const CIRCLE_STEPS = 64;
const TRIANGLE_HEIGHT = 300;
const BEAM_WIDTH_DEGREES = 30;

//TODO don't hard-code this table
const MCS_TABLE = DEFAULT_MCS_TABLE.sort(
  (a, b) => b.rangeMeters - a.rangeMeters,
);

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
      const startPoint = turf.point(startCoords, {
        ...node,
      });
      const mcsRings = mcsRingsTemplate(startCoords, mcsTable);
      const pointBearing = BEAM_WIDTH_DEGREES / 2.0;
      const eastPoint = turf.transformTranslate(
        startPoint,
        TRIANGLE_HEIGHT,
        pointBearing,
        {
          units: 'meters',
        },
      );
      const westPoint = turf.transformTranslate(
        startPoint,
        TRIANGLE_HEIGHT,
        -pointBearing,
        {
          units: 'meters',
        },
      );
      // start must always be first and last coord
      const triangleCoords: Array<GeoCoord> = [
        startPoint,
        eastPoint,
        westPoint,
        startPoint,
      ].map(turf.getCoord);

      // first, build a triangle facing north
      const triangle = turf.polygon([triangleCoords]);
      turf.transformRotate(triangle, nodeBearing ?? 0, {
        mutate: true,
        pivot: startCoords,
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
      return segments;
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
    </>
  );
}

function getEstimatedNodeBearing(
  node: Node,
  topologyMaps: $Shape<TopologyMaps>,
) {
  const site = topologyMaps.siteMap[node.site_name];
  const peerLocations = getWirelessPeers(node, topologyMaps).map(
    (peerNode: Node) => {
      const peerSite = topologyMaps.siteMap[peerNode.site_name];
      return peerSite.location;
    },
  );
  if (peerLocations.length < 1) {
    return null;
  }
  const bearings = peerLocations.map(peerLocation =>
    turf.bearing(
      [site.location.longitude, site.location.latitude, site.location.altitude],
      [peerLocation.longitude, peerLocation.latitude, peerLocation.altitude],
    ),
  );
  const averageBearing = averageAngles(bearings);
  return averageBearing;
}

/*
 * Get the nodes on the other side of this node's wireless links */
function getWirelessPeers(
  node: Node,
  {linkMap, nodeToLinksMap, nodeMap}: TopologyMaps,
): Array<Node> {
  const peers: Array<Node> = [];
  for (const linkName of Array.from(nodeToLinksMap[node.name] || [])) {
    const link = linkMap[linkName];
    if (link.link_type === LinkType.WIRELESS) {
      // get node on the other side of the link
      const peerName =
        link.a_node_name === node.name ? link.z_node_name : link.a_node_name;
      const peer = nodeMap[peerName];
      if (!peer) {
        console.error(`peer not found: ${peerName}`);
        continue;
      }
      peers.push(peer);
    }
  }

  return peers;
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

/**
 * TODO: proper label placement by generating points where labels should be
 */
export function McsEstimateTextLayer() {
  return (
    <Layer
      id={LAYER_ID + '-text'}
      before="site-layer"
      type="symbol"
      sourceId={SOURCE_ID}
      layout={{
        'text-field': '{mcs}',
        'text-size': 12,
      }}
      paint={LINE_TEXT_PAINT}
    />
  );
}

function useMapProfileMcsTable() {
  const {networkConfig} = useNetworkContext();
  return React.useMemo(() => {
    if (
      networkConfig != null &&
      networkConfig?.map_profile?.data?.mcsTable != null
    ) {
      const mcsTable = networkConfig.map_profile.data.mcsTable.sort(
        (a, b) => b.rangeMeters - a.rangeMeters,
      );
      return mcsTable;
    }
    return MCS_TABLE;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkConfig]);
}
